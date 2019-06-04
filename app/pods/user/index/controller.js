import Controller from '@ember/controller';
import { readOnly } from '@ember/object/computed';

export default class UserIndexController extends Controller {
  @readOnly('model') users;
}
