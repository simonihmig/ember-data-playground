import JSONAPISerializer from 'ember-data/serializers/json-api';
import EmbeddedRecordsMixin from 'ember-data/serializers/embedded-records-mixin';

export default class ApplicationSerializer extends JSONAPISerializer.extend(EmbeddedRecordsMixin) {
}

JSONAPISerializer.reopen({
  willMergeMixin() {
    // override method to squash warning message about the JSONAPISerializer not supporting EmbeddedRecordsMixin
    // we do that deliberately, knowing that we "extend" the JSON API spec here.
  }
});