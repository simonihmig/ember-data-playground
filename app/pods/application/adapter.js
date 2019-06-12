import DS from 'ember-data';
import { v4 } from 'uuid';

export default class CascadingAdapter extends DS.JSONAPIAdapter {
  generateIdForRecord() {
    return v4();
  }

  async deleteRecord(store, _, snapshot) {
    let { record } = snapshot;
    let recordsToUnload = this.unloadCascadeRecords(store, snapshot.record);
    let relationshipsToClear = this._getCascadingRelationshipDescriptors(snapshot.record);

    const response = await super.deleteRecord(store, _, snapshot);
    recordsToUnload.forEach((childRecord) => {
      store.unloadRecord(childRecord);
    });
    relationshipsToClear.forEach(({ kind, key }) => {
      if (kind === 'hasMany') {
        record[key].clear();
      } else {
        record[key] = null;
      }
    });

    return response;
  }

  _getCascadingRelationshipDescriptors(record) {
    let relationships = [];
    record.eachRelationship((name, descriptor) => {
      let { options } = descriptor;

      if (options.cascadeDelete) {
        relationships.push(descriptor);
      }
    });

    return relationships;
  }

  unloadCascadeRecords(store, record) {
    let recordsToUnload = [];

    this._getCascadingRelationshipDescriptors(record)
      .forEach(({ kind, key }) => {
        if (kind === 'hasMany') {
          let hasManyRecordsArray = [];
          let hasManyRecords = record.hasMany(key).value();
          if (hasManyRecords !== null) {
            hasManyRecordsArray = hasManyRecords.toArray();
          }
          recordsToUnload = recordsToUnload.concat(hasManyRecordsArray);
        }

        if (kind === 'belongsTo') {
          let belongsToRecords = record.belongsTo(key).value();
          recordsToUnload = recordsToUnload.push(belongsToRecords);
        }
      });

    let childRecords = recordsToUnload.reduce((a, r) => {
      return a.concat(this.unloadCascadeRecords(store, r));
    }, []);

    return recordsToUnload.concat(childRecords);
  }

}
