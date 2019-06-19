import MirageResponse from 'ember-cli-mirage/response';

export default function() {

  // These comments are here to help you get started. Feel free to delete them.

  /*
    Config (with defaults).

    Note: these only affect routes defined *after* them!
  */

  // this.urlPrefix = '';    // make this `http://localhost:8080`, for example, if your API is on a different server
  // this.namespace = '';    // make this `/api`, for example, if your API is namespaced
  // this.timing = 400;      // delay for each request, automatically set to 0 during testing

  /*
    Shorthand cheatsheet:

    this.get('/posts');
    this.post('/posts');
    this.get('/posts/:id');
    this.put('/posts/:id'); // or this.patch
    this.del('/posts/:id');

    http://www.ember-cli-mirage.com/docs/v0.4.x/shorthands/
  */

  this.get('/companies');
  this.get('/companies/:id');
  this.post('/companies');

  // simulate the API doing a cascading delete ini Mirage!
  this.del('/companies/:id', (schema, request) => {
    let id = request.params.id;
    let company = schema.companies.find(id);

    company.departments.models.forEach(d => d.users.destroy());
    company.departments.destroy();
    company.destroy();
  });

  this.patch('/companies/:id', function (schema, request) {
    try {
      const company = JSON.parse(request.requestBody);
      const departments = [];
      const users = [];

      if (!company.data.relationships) {
        company.data.relationships = {};
      }

      company.data.relationships.departments = {data: []};

      company.data.departments.forEach((department) => {
        company.data.relationships.departments.data.push({id: department.data.id, type: department.data.type});

        if (!department.data.relationships) {
          department.data.relationships = {};
        }

        department.data.relationships.users = {data: []};

        department.data.users.forEach((user) => {
          department.data.relationships.users.data.push({id: user.data.id, type: user.data.type});
          const userAttrs = this._getAttrsForRequest({requestBody: JSON.stringify(user)}, 'user');
          schema.db.users.update(userAttrs.id, userAttrs);
          users.push(user.data);
        });

        delete department.data.users;

        const departmentAttrs = this._getAttrsForRequest({requestBody: JSON.stringify(department)}, 'department');
        schema.db.departments.update(departmentAttrs.id, departmentAttrs);
        departments.push(department.data);
      });

      delete company.data.departments;

      const companyAttrs = this._getAttrsForRequest({requestBody: JSON.stringify(company)}, 'company');
      schema.db.companies.update(companyAttrs.id, companyAttrs);

      return new MirageResponse(200, {}, {
        data: company.data,
        included: [
          ...departments.uniqBy('id'),
          ...users.uniqBy('id'),
        ],
      });
    } catch (e) {
      debugger // eslint-disable-line
    }
  });

  this.get('/departments');
  this.get('/departments/:id');
  this.post('/departments');
  this.patch('/departments/:id');
  this.del('/departments/:id');

  this.get('/users');
  this.get('/users/:id');
  this.post('/users');
  this.patch('/users/:id');
  this.del('/users/:id');
}
