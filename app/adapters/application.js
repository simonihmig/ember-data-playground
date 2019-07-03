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
    // Special case: using `record.destroyRecord()` to delete a record without a network request
    if (snapshot.adapterOptions && snapshot.adapterOptions.dontPersist) {
      return;
    }

    const response = await super.deleteRecord(store, _, snapshot);

    if (response && response.deleted) {
      const {deleted} = response;
      delete response.deleted;

      for (let {id, type} of deleted) {
        const childModelNameSingularDasherized = singularize(dasherize(type));
        const record = store.peekRecord(childModelNameSingularDasherized, id);

        if (record) {
          await record.destroyRecord({adapterOptions: {dontPersist: true}});
          store.unloadRecord(record);
        }
      }
    }
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

  _getCascadingRelationshipDescriptors(record, option) {
    let relationships = [];

    record.eachRelationship((name, descriptor) => {
      let { options } = descriptor;

      if (options[option]) {
        relationships.push(descriptor);
      }
    });

    return relationships;
  }

  _getCascadedRecords(store, record, option) {
    const cascadingRelationships = this._getCascadingRelationshipDescriptors(record, option);
    const records = cascadingRelationships.reduce((result, {kind, key}) => {
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

    const childRecords = records.reduce((result, childRecord) => {
      const childRecordsToUnload = this._getCascadedRecords(store, childRecord, option);
      return result.addObjects(childRecordsToUnload);
    }, []);

    return records.addObjects(childRecords);
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
        const childModelNameSingularDasherized = singularize(dasherize(childModelNamePlural));
        const record = store.peekRecord(childModelNameSingularDasherized, id);

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
        ._getCascadedRecords(store, snapshot.record, 'cascadeSave')
        .map((record) => {
          return record.save({adapterOptions: {dontPersist: true}});
        });

    return RSVP.all(promises);
  }

}
