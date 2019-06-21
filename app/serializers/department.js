import JSONAPISerializer from 'ember-data/serializers/json-api';
import EmbeddedRecordsMixin from 'ember-data/serializers/embedded-records-mixin';

export default class CompanySerializer extends JSONAPISerializer.extend(EmbeddedRecordsMixin) {
  attrs = {
    users: {
      serialize: 'records',
    },
  };
}
