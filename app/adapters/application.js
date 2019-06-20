import JSONAPIAdapter from 'ember-data/adapters/json-api';
import {InvalidError} from 'ember-data/adapters/errors';
import { dasherize }  from '@ember/string';
import { pluralize, singularize } from 'ember-inflector';
import { v4 } from 'uuid';
import RSVP from 'rsvp';

export default class CascadingAdapter extends JSONAPIAdapter {
  generateIdForRecord() {
    return v4();
  }

  async deleteRecord(store, _, snapshot) {
    const { record } = snapshot;
    const response = await super.deleteRecord(store, _, snapshot);

    // Unload cascaded records
    const recordsToUnload = this._getCascadedRecords(store, snapshot.record);
    recordsToUnload.forEach((childRecord) => {
      store.unloadRecord(childRecord);
    });

    // Clear relationships on deleted record
    const relationshipDescriptors = this._getCascadingRelationshipDescriptors(snapshot.record);
    relationshipDescriptors.forEach(({ kind, key }) => {
      const value = kind === 'hasMany' ? [] : null;
      record.set(key, value);
    });

    return response;
  }

  async updateRecord(store, type, snapshot) {
    // Special case: using `record.save()` to mark a record as invalid without a network request
    if (snapshot.adapterOptions && snapshot.adapterOptions.errors) {
      // https://api.emberjs.com/ember-data/3.10/classes/DS.InvalidError
      return RSVP.reject(new InvalidError(snapshot.adapterOptions.errors));
    }

    // Special case: using `record.save()` to mark a record as saved without a network request
    if (snapshot.adapterOptions && snapshot.adapterOptions.dontPersist) {
      return;
    }

    let response;
    try {
      response = await super.updateRecord(store, type, snapshot);
    } catch(e) {

      // Look for nested record errors in the errors payload
      if (e.errors) {

        // Group errors by record
        const {ownErrors, childRecordErrors} = this._groupErrorsByRecord(e, snapshot);

        // Apply errors to corresponding records
        await this._applyErrorsToChildRecords(store, childRecordErrors);

        // Keep only own errors in the payload
        return RSVP.reject(new InvalidError(ownErrors));
      }

      // Unknown error, simply throw it
      throw e;
    }

    // Marking child records as saved.
    // Though it is not required for exisitng records (they are somehow magically marked as saved automatically),
    // this is still needed for new child records.
    await this._markChildRecordsAsSaved(store, snapshot);

    return response;
  }

  _getCascadingRelationshipDescriptors(record) {
    let relationships = [];

    record.eachRelationship((name, descriptor) => {
      let { options } = descriptor;

      if (options.cascade) {
        relationships.push(descriptor);
      }
    });

    return relationships;
  }

  _getCascadedRecords(store, record) {
    const relationshipsToClear = this._getCascadingRelationshipDescriptors(record);
    const recordsToUnload = relationshipsToClear.reduce((result, {kind, key}) => {
      if (kind === 'hasMany') {
        let hasManyRecordsArray = [];
        let hasManyRecords = record.hasMany(key).value();
        if (hasManyRecords !== null) {
          hasManyRecordsArray = hasManyRecords.toArray();
        }
        result.addObjects(hasManyRecordsArray);
      }

      if (kind === 'belongsTo') {
        let belongsToRecords = record.belongsTo(key).value();
        result.addObject(belongsToRecords);
      }

      return result;
    }, []);

    const childRecords = recordsToUnload.reduce((result, childRecord) => {
      const childRecordsToUnload = this._getCascadedRecords(store, childRecord);
      return result.addObjects(childRecordsToUnload);
    }, []);

    return recordsToUnload.addObjects(childRecords);
  }

  _groupErrorsByRecord(e, snapshot) {
    const ownErrors = [];
    const childRecordErrors = {};

    const modelNamePlural = pluralize(dasherize(snapshot.modelName));

    e.errors.forEach(error => {
      if (
        error.source
        && error.source.identity
        && error.source.identity.id
        && error.source.identity.type
        && (
          error.source.identity.id !== snapshot.id
          || error.source.identity.type !== modelNamePlural
        )
      ) {
        const {id, type} = error.source.identity;

        if (!childRecordErrors[type]) {
          childRecordErrors[type] = {};
        }

        if (!childRecordErrors[type][id]) {
          childRecordErrors[type][id] = [];
        }

        childRecordErrors[type][id].push(error);
      } else {
        ownErrors.push(error);
      }
    });

    return {ownErrors, childRecordErrors};
  }

  async _applyErrorsToChildRecords(store, childRecordErrors) {
    const promises = [];

    Object.keys(childRecordErrors).forEach(childModelNamePlural => {
      Object.keys(childRecordErrors[childModelNamePlural]).forEach(id => {
        const childModelNameSingular = singularize(childModelNamePlural);
        const record = store.peekRecord(childModelNameSingular, id);

        if (record) {
          const promise = record.save({adapterOptions: {errors: childRecordErrors[childModelNamePlural][id]}});
          promises.push(promise);
        }
      });
    });

    try {
      await RSVP.all(promises);
    } catch(e) {
      // expected to reject
    }
  }

  _markChildRecordsAsSaved(store, snapshot) {
    const promises =
      this
        ._getCascadedRecords(store, snapshot.record)
        .map((record) => {
          return record.save({adapterOptions: {dontPersist: true}});
        });

    return RSVP.all(promises);
  }

}
