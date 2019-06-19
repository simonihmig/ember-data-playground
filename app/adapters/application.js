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
      if (kind === 'hasMany') {
        record.set(key, []);
      } else {
        record.set(key, null);
      }
    });

    return response;
  }

  async updateRecord(store, type, snapshot) {
    // This code block is only required for approach 1, which is commented out below.
    // // Special case: using `record.save()` to mark a record as invalid without a network request
    // if (snapshot.adapterOptions && snapshot.adapterOptions.errors) {
    //   // https://api.emberjs.com/ember-data/3.10/classes/DS.InvalidError
    //   return RSVP.reject(new InvalidError(snapshot.adapterOptions.errors));
    // }

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
        const modelNamePlural = pluralize(dasherize(snapshot.modelName));

        // // ---------- APPROACH 1 START
        // // This approach is not working for some reason. `record.errors` is not populated like documentation says it should:
        // // https://api.emberjs.com/ember-data/3.10/classes/DS.InvalidError

        // // Group errors by record
        // const otherErrors = {};
        // e.errors.forEach(error => {
        //   if (error.id && error.modelName && error.id !== snapshot.id && error.modelName !== modelNamePlural) {
        //     if (!otherErrors[error.modelName]) {
        //       otherErrors[error.modelName] = {};
        //     }
        //     if (!otherErrors[error.modelName][error.id]) {
        //       otherErrors[error.modelName][error.id] = [];
        //     }
        //     otherErrors[error.modelName][error.id].push(error);
        //   }
        // });

        // // Apply errors to corresponding records
        // const saveWithErrorPromises = [];
        // Object.keys(otherErrors).forEach(childModelNamePlural => {
        //   Object.keys(otherErrors[childModelNamePlural]).forEach(id => {
        //     const childModelNameSingular = singularize(childModelNamePlural);
        //     const record = store.peekRecord(childModelNameSingular, id);

        //     if (record) {
        //       const promise = record.save({adapterOptions: {errors: otherErrors[childModelNamePlural][id]}});
        //       saveWithErrorPromises.push(promise);
        //     }
        //   })
        // });

        // try {
        //   await RSVP.all(saveWithErrorPromises);
        // } catch(e) {
        //   // expected to reject
        // }

        // // Keep only own errors in the payload.
        // const remainingErrors = e.errors.filter(error => !error.id || (error.id === snapshot.id && error.modelName === modelNamePlural));
        // return RSVP.reject(new InvalidError(remainingErrors));
        // // ---------- APPROACH 1 END ----------------

        // ---------- APPROACH 2 START ----------------
        // Since the approach 1 does not populate `record.errors` for some reason, we're gonna populate them manually:

        if (!e.errors.every(error => 'attribute' in error)) {
          // Some errors are not validation erros. Can't rely on approach 2!
          throw e;
        }

        // Reset validation errors on each record:
        [
          snapshot.record,
          ...this._getCascadedRecords(store, snapshot.record),
        ].forEach(record => {
          record.eachAttribute((key) => {
            record.errors.remove(key);
          });
        });

        // Add errors to records. For some reason, doing this does not populate record.errors:
        // https://api.emberjs.com/ember-data/3.10/classes/DS.InvalidError
        e.errors.forEach(error => {
          // Checking if the error is a validation error of a child record
          if (error.attribute && error.id && error.id !== snapshot.id && error.modelName &&  error.modelName !== modelNamePlural) {
            // Looking up child record
            const childModelNameSingular = singularize(error.modelName);
            const record = store.peekRecord(childModelNameSingular, error.id);

            if (record) {
              // Manually adding the error to a child record
              record.errors.add(error.attribute, error.message);
            }
          } else {
            // Manually adding the error to the current record
            snapshot.record.errors.add(error.attribute, error.message);
          }
        });
        // ---------- APPROACH 2 END ----------------

        return RSVP.reject(new InvalidError());
      }

      throw e;
    }

    // Marking child records as saved.
    // Though it is not required for exisitng records (they are somehow magically marked as saved automatically),
    // this is still needed for new child records.
    this
      ._getCascadedRecords(store, snapshot.record)
      .forEach((record) => {
        record.save({adapterOptions: {dontPersist: true}});
      });

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

}
