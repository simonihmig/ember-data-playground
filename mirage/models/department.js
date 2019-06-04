import { belongsTo, hasMany, Model } from 'ember-cli-mirage';

export default Model.extend({
  company: belongsTo(),
  users: hasMany()
});
