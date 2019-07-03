import { belongsTo, Model } from 'ember-cli-mirage';

export default Model.extend({
  department: belongsTo('department', {inverse: 'users'}),
  company: belongsTo('company', {inverse: 'users'})
});
