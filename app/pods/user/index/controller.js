import Controller from '@ember/controller';
import { readOnly } from '@ember/object/computed';
import { action } from '@ember/object';

export default class UserIndexController extends Controller {
  @readOnly('model') users;

  @action
  delete(user) {
    return user.destroyRecord();
  }
}
