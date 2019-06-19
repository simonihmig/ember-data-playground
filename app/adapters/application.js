import JSONAPIAdapter from 'ember-data/adapters/json-api';
import { v4 } from 'uuid';

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

  // async updateRecord(store, type, snapshot) {
  //   if (!snapshot.adapterOptions || !snapshot.adapterOptions.dontPersist) {
  //     const recordsToMarkAsSaved = this._getCascadedRecords(store, snapshot.record);
  //     const response = await super.updateRecord(store, type, snapshot);

  //     recordsToMarkAsSaved.forEach((record) => {
  //       record.save({adapterOptions: {dontPersist: true}});
  //     });

  //     return response;
  //   }
  // }

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
