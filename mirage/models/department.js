import { belongsTo, hasMany, Model } from 'ember-cli-mirage';

export default Model.extend({
  company: belongsTo('company', {inverse: 'departments'}),
  users: hasMany('user', {inverse: 'department'})
});
