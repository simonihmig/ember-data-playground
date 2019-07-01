import { module, test } from 'qunit';
import { setupTest } from 'ember-qunit';
import { setupMirage } from 'ember-cli-mirage/test-support';
import { settled } from '@ember/test-helpers';

module('Unit | Store | cascade', function(hooks) {
  setupTest(hooks);
  setupMirage(hooks);

  module('delete', function() {

    test('it cascades into enabled relationships', async function(assert) {
      const store = this.owner.lookup('service:store');
      const companyMirage = this.server.create('company', 'withDepartmentsAndUsers');
      const company = await store.findRecord('company', companyMirage.id, { include: 'departments,departments.users'});
      const departments = await store.findAll('department');
      const users = await store.findAll('user');

      // make sure our seeding is correct
      assert.ok(company, 'company exists');
      assert.ok(company.departments.length > 0, 'company has departments');
      assert.equal(company.departments.filter(d => d.users.length === 0).length, 0, 'All departments have users');

      // dispatch the deletion
      await company.destroyRecord();
      await settled();

      // company has been deleted...
      // client-side
      assert.ok(company.isDeleted, 'company model has been deleted');
      assert.ok(company.isValid, 'company model is valid');

      // server-side
      assert.equal(this.server.schema.companies.all().length, 0, 'No company record on backend');

      // departments have been deleted...
      // client-side
      assert.equal(company.departments.length, 0, 'company has no departments');
      assert.equal(store.peekAll('department').length, 0, 'department models are unloaded');
      assert.equal(departments.filter(d => d.isDeleted.length), departments.length, 'all departments are flagged as deleted');

      // server-side
      assert.equal(this.server.schema.departments.all().length, 0, 'No department records on backend');

      // users have been deleted...
      // client-side
      assert.equal(store.peekAll('user').length, 0, 'user models are unloaded');
      assert.equal(users.filter(u => u.isDeleted.length), users.length, 'all users are flagged as deleted');

      // server-side
      assert.equal(this.server.schema.users.all().length, 0, 'No department records on backend');
    });
  });



  module('save', function() {
    test('it cascades into enabled relationships: modifying', async function(assert) {
      this.server.logging = true;

      const store = this.owner.lookup('service:store');
      const companyMirage = this.server.create('company', 'withDepartmentsAndUsers');
      const company = await store.findRecord('company', companyMirage.id, { include: 'departments,departments.users'});
      const departments = await store.findAll('department');
      const users = await store.findAll('user');

      // make sure our seeding is correct
      assert.ok(company, 'company exists');
      assert.ok(company.departments.length > 0, 'company has departments');
      assert.equal(company.departments.filter(d => d.users.length === 0).length, 0, 'All departments have users');
      assert.ok(departments.length > 0, 'global departments count is positive');
      assert.ok(users.length > 0, 'global users count is positive');

      // mutate all records
      company.set('name', 'foo');
      departments.forEach(d => d.set('name', 'foo'));
      users.forEach(u => u.set('firstName', 'foo'));

      // make sure the records are properly mutated
      assert.ok(company.hasDirtyAttributes, 'company model hasDirtyAttributes');
      assert.equal(departments.filterBy('hasDirtyAttributes', false), 0, 'departments without dirty attributes count');
      assert.equal(departments.filterBy('currentState.stateName', 'root.loaded.saved'), 0, 'departments with saved state count');
      assert.equal(users.filterBy('hasDirtyAttributes', false), 0, 'users without dirty attributes count');
      assert.equal(users.filterBy('currentState.stateName', 'root.loaded.saved'), 0, 'users with saved state count');

      // dispatch the save
      await company.save();
      await settled();

      // company has been saved...
      // client-side
      assert.notOk(company.hasDirtyAttributes, 'company model hasDirtyAttributes');
      assert.ok(company.isValid, 'company model is valid');
      assert.equal(company.currentState.stateName, 'root.loaded.saved', 'company state');

      // server-side
      assert.equal(this.server.schema.companies.first().name, 'foo', 'company name on the backend side');

      // departments have been marked as saved...
      // client-side
      assert.equal(departments.filterBy('hasDirtyAttributes', true), 0, 'departments with dirty attributes count');
      assert.equal(departments.filterBy('isValid', false), 0, 'invalid departments count');
      assert.equal(departments.filter(d => d.name !== 'foo'), 0, 'departments with old name count');
      assert.equal(departments.filter(d => d.currentState.stateName !== 'root.loaded.saved'), 0, 'departments with state other than saved');

      // server-side
      assert.equal(this.server.schema.departments.all().models.filter(d => d.name !== 'foo').length, 0, 'departments with original name on the backend side');

      // users have been marked as saved...
      // client-side
      assert.equal(users.filterBy('hasDirtyAttributes', true), 0, 'users with dirty attributes count');
      assert.equal(users.filterBy('isValid', false), 0, 'invalid users count');
      assert.equal(users.filter(u => u.firstName !== 'foo'), 0, 'users with old name count');
      assert.equal(users.filter(u => u.currentState.stateName !== 'root.loaded.saved'), 0, 'users with state other than saved');

      // server-side
      assert.equal(this.server.schema.users.all().models.filter(u => u.firstName !== 'foo').length, 0, 'users with original firstName on the backend side');
    });

    test('it cascades into enabled relationships: adding a new child record', async function(assert) {
      this.server.logging = true;

      const store = this.owner.lookup('service:store');
      const companyMirage = this.server.create('company', 'withDepartmentsAndUsers');
      const company = await store.findRecord('company', companyMirage.id, { include: 'departments,departments.users'});
      const departments = await store.findAll('department');
      const users = await store.findAll('user');

      // make sure our seeding is correct
      assert.ok(company, 'company exists');
      assert.ok(company.departments.length > 0, 'company has departments');
      assert.equal(company.departments.filter(d => d.users.length === 0).length, 0, 'All departments have users');
      assert.ok(departments.length > 0, 'global departments count is positive');
      assert.ok(users.length > 0, 'global users count is positive');

      let previousDepartmentCount =  departments.length;
      // add a child
      const department = store.createRecord('department');
      company.departments.addObject(department);

      // dispatch the save
      await company.save();
      await settled();

      // company has been saved...
      // client-side
      assert.notOk(company.hasDirtyAttributes, 'company model hasDirtyAttributes');
      assert.ok(company.isValid, 'company model is valid');
      assert.equal(company.currentState.stateName, 'root.loaded.saved', 'company state');

      // departments have been marked as saved...
      // client-side
      assert.equal(departments.filterBy('hasDirtyAttributes', true), 0, 'departments with dirty attributes count');
      assert.equal(departments.filterBy('isValid', false), 0, 'invalid departments count');
      assert.equal(departments.filter(d => d.currentState.stateName !== 'root.loaded.saved'), 0, 'departments with state other than saved');
      assert.equal(departments.length, previousDepartmentCount + 1, 'department has additional record');

      assert.equal(this.server.schema.departments.all().models.length, departments.length, 'departments count on the backend side');

      // users have been marked as saved...
      // client-side
      assert.equal(users.filterBy('hasDirtyAttributes', true), 0, 'users with dirty attributes count');
      assert.equal(users.filterBy('isValid', false), 0, 'invalid users count');
      assert.equal(users.filter(u => u.currentState.stateName !== 'root.loaded.saved'), 0, 'users with state other than saved');
    });

    test('when parent save fails, child records contain errors', async function(assert) {
      this.server.logging = true;

      const store = this.owner.lookup('service:store');
      const companyMirage = this.server.create('company', 'withDepartmentsAndUsers');
      const company = await store.findRecord('company', companyMirage.id, { include: 'departments,departments.users'});
      const departments = await store.findAll('department');
      const users = await store.findAll('user');

      // make sure our seeding is correct
      assert.ok(company, 'company exists');
      assert.ok(company.departments.length > 0, 'company has departments');
      assert.equal(company.departments.filter(d => d.users.length === 0).length, 0, 'All departments have users');
      assert.ok(departments.length > 0, 'global departments count is positive');
      assert.ok(users.length > 0, 'global users count is positive');

      // mutate all records
      company.set('name', 'foo');
      departments.forEach(d => d.set('name', 'foo'));
      users.forEach(u => u.set('firstName', 'foo'));

      // make sure the records are properly mutated
      assert.ok(company.hasDirtyAttributes, 'company model hasDirtyAttributes');
      assert.equal(departments.filterBy('hasDirtyAttributes', false), 0, 'departments without dirty attributes count');
      assert.equal(departments.filterBy('currentState.stateName', 'root.loaded.saved'), 0, 'departments with saved state count');
      assert.equal(users.filterBy('hasDirtyAttributes', false), 0, 'users without dirty attributes count');
      assert.equal(users.filterBy('currentState.stateName', 'root.loaded.saved'), 0, 'users with saved state count');

      // use invalid names on some records
      company.set('name', 'invalid');
      departments.findBy('id', '2').set('name', 'invalid');
      users.findBy('id', '2').set('firstName', 'invalid');

      // dispatch the save
      try {
        await company.save();
        await settled();
      } catch (e) {
        // A failure is expected
      }

      // company has not been saved...
      assert.ok(company.hasDirtyAttributes, 'company model hasDirtyAttributes');
      assert.notOk(company.isValid, 'company model is isValid');

      // departments not have been marked as saved...
      assert.equal(departments.filterBy('hasDirtyAttributes', false), 0, 'departments with clean attributes count');
      assert.equal(departments.filterBy('isValid', false).length, 1, 'invalid departments count');

      // users have not been marked as saved...
      assert.equal(users.filterBy('hasDirtyAttributes', false), 0, 'users with clean attributes count');
      assert.equal(users.filterBy('isValid', false).length, 1, 'invalid users count');

      // invalid company
      let errors = company.errors.toArray();
      assert.equal(errors.length, 1, 'invalid company errors count');
      assert.equal(errors[0].attribute, 'name', 'invalid company error 0 attribute');
      assert.equal(errors[0].message, 'This value is reserved', 'invalid company error 0 message');

      // invalid department
      const invalidDepartment = departments.findBy('name', 'invalid');
      errors = invalidDepartment.errors.toArray();
      assert.equal(errors.length, 1, 'invalid department errors count');
      assert.equal(errors[0].attribute, 'name', 'invalid department error 0 attribute');
      assert.equal(errors[0].message, 'This value is reserved', 'invalid department error 0 message');

      // invalid department
      const invalidUser = users.findBy('firstName', 'invalid');
      errors = invalidUser.errors.toArray();
      assert.equal(errors.length, 1, 'invalid user errors count');
      assert.equal(errors[0].attribute, 'firstName', 'invalid user error 0 attribute');
      assert.equal(errors[0].message, 'This value is reserved', 'invalid user error 0 message');
    });
  });
});
