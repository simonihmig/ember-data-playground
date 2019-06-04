import Component from '@ember/component';
import { action } from '@ember/object';
import { buildValidations, validator } from 'ember-cp-validations';
import listenTo from '../../../utils/listen-to';

const Validations = buildValidations({
  firstName: validator('presence', true),
  lastName: validator('presence', true),
  username: validator('presence', true),
  email: [
    validator('presence', true),
    validator('format', { type: 'email' })
  ]
});

export default class UserFormComponent extends Component.extend(Validations) {

  user;

  @listenTo('user.firstName')
  firstName;

  @listenTo('user.lastName')
  lastName;

  @listenTo('user.username')
  username;

  @listenTo('user.email')
  email;

  onSubmit() {}

  @action
  submit() {
    let data = this.getProperties('firstName', 'lastName', 'username', 'email');
    this.onSubmit(data);
  }

}
