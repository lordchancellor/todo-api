const expect = require('expect');
const request = require('supertest');
const { ObjectID } = require('mongodb');

const { app } = require('./../server');
const { Todo } = require('./../models/todo');
const { User } = require('./../models/user');
const { todos, populateTodos, users, populateUsers } = require('./seed/seed');

beforeEach(populateUsers);
beforeEach(populateTodos);

// POST
describe('POST /todos', () => {
	it('should create a new todo', (done) => {
		const text = 'Test todo';

		request(app)
			.post('/todos')
			.send({ text })
			.expect(200)
			.expect((res) => {
				expect(res.body.text).toBe(text);
			})
			.end((err, res) => {
				if (err) {
					return done(err);
				}

				Todo.find()
						.then((todos) => {
							expect(todos.length).toBe(3);
							expect(todos[2].text).toBe(text);
							done();
						})
						.catch((e) => done(e));
			});
	});

	it('should not create todo with invalid body data', (done) => {
		request(app)
			.post('/todos')
			.send()
			.expect(400)
			.end((err, res) => {
				if (err) {
					return done(err);
				}

				Todo.find()
						.then((todos) => {
							expect(todos.length).toBe(2);
							done();
						})
						.catch((e) => done(e));
			});
	});
});

// GET
describe('GET /todos', () => {
	it('should get all todos', (done) => {
		request(app)
			.get('/todos')
			.expect(200)
			.expect((res) => {
				expect(res.body.todos.length).toBe(2)
			})
			.end(done);
	});
});

// GET single todo
describe('GET /todos/:id', () => {
	it('should return todo', (done) => {
		request(app)
			.get(`/todos/${todos[0]._id.toHexString()}`)
			.expect(200)
			.expect((res) => {
				expect(res.body.todo.text).toBe(todos[0].text);
			})
			.end(done);
	});

	it('should return a 404 if todo not found', (done) => {
		request(app)
			.get(`/todos/${new ObjectID().toHexString()}`)
			.expect(404)
			.end(done);
	});

	it('should return a 404 if id is invalid', (done) => {
		request(app)
			.get('/todos/123')
			.expect(404)
			.end(done);
	});
});

// DELETE
describe('DELETE /todos/:id', () => {
	it('should remove a todo', (done) => {
		const hexId = todos[1]._id.toHexString();

		request(app)
			.delete(`/todos/${hexId}`)
			.expect(200)
			.expect((res) => {
				expect(res.body.todo._id).toBe(hexId);
			})
			.end((err, res) => {
				if (err) {
					return done(err);
				}

				Todo.findById(hexId)
						.then((todo) => {
							expect(todo).toNotExist();
							done();
						})
						.catch((e) => done(e));
			});
	});

	it('should return a 404 if the todo not found', (done) => {
		request(app)
			.delete(`/todos/${new ObjectID().toHexString()}`)
			.expect(404)
			.end(done);
	});

	it('should return 404 if the id is invalid', (done) => {
		request(app)
			.delete('/todos/123')
			.expect(404)
			.end(done);
	});
});

// PATCH
describe('PATCH /todos/:id', () => {
	it('should update the todo', (done) => {
		const hexId = todos[0]._id.toHexString();
		const text = 'Updated todo';

		request(app)
			.patch(`/todos/${hexId}`)
			.send({text, completed: true})
			.expect(200)
			.expect((res) => {
				const todo = res.body.todo;

				expect(todo.text).toBe(text);
				expect(todo.completed).toBe(true);
				expect(todo.completedAt).toBeA('number');
			})
			.end(done);
	});

	it('should clear completedAt when todo is not completed', (done) => {
		const hexId = todos[1]._id.toHexString();
		const text = 'Second updated todo';

		request(app)
			.patch(`/todos/${hexId}`)
			.send({text, completed: false})
			.expect(200)
			.expect((res) => {
				const todo = res.body.todo;

				expect(todo.text).toBe(text);
				expect(todo.completed).toBe(false);
				expect(todo.completedAt).toBe(null);
			})
			.end(done);
	});
});

describe('GET /users/me', () => {
	it('should return a user if authenticated', (done) => {
		request(app)
			.get('/users/me')
			.set('x-auth', users[0].tokens[0].token)
			.expect(200)
			.expect((res) => {
				expect(res.body._id).toBe(users[0]._id.toHexString());
				expect(res.body.email).toBe(users[0].email);
			})
			.end(done);
	});

	it('should return a 401 if not authenticated', (done) => {
		request(app)
			.get('/users/me')
			.expect(401)
			.expect((res) => {
				expect(res.body).toEqual({});
			})
			.end(done);
	});
});

describe('POST /users', () => {
	it('should create a user', (done) => {
		const email = 'test@test.me';
		const password = 'passwordWhut';

		request(app)
			.post('/users')
			.send({ email, password })
			.expect(200)
			.expect((res) => {
				expect(res.headers['x-auth']).toExist();
				expect(res.body._id).toExist();
				expect(res.body.email).toBe(email);
			})
			.end((err) => {
				if (err) {
					return done(err);
				}

				User.findOne({ email })
						.then((user) => {
							expect(user).toExist();
							expect(user.password).toNotBe(password);
							done();
						})
						.catch((e) => done(e));
			});
	});

	it('should return validation errors if request invalid', (done) => {
		const invalidEmail = 'invalidemail.com';
		const invalidPassword = '1';

		request(app)
			.post('/users')
			.send({ invalidEmail, invalidPassword })
			.expect(400)
			.end(done);
	});

	it('should not create user if email in use', (done) => {
		const dupeEmail = users[0].email;
		const password = 'password';

		request(app)
			.post('/users')
			.send({ dupeEmail, password })
			.expect(400)
			.end(done);
	});
});

describe('POST /users/login', () => {
	it('should login user and return auth token', (done) => {
		request(app)
			.post('/users/login')
			.send({ email: users[1].email, password: users[1].password })
			.expect(200)
			.expect((res) => {
				expect(res.headers['x-auth']).toExist();
			})
			.end((err, res) => {
				if (err) {
					return done(err);
				}

				User.findById(users[1]._id)
					.then((user) => {
						expect(user.tokens[0]).toInclude({
							access: 'auth',
							token: res.headers['x-auth']
						});
						done();
					})
					.catch((e) => done(e));
			});
	});

	it('should reject invalid login', (done) => {
		const invalidPassword = 'ncc-1701';
		request(app)
			.post('/users/login')
			.send({ email: users[1].email, password: invalidPassword })
			.expect(400)
			.expect((res) => {
				expect(res.headers['x-auth']).toNotExist();
			})
			.end((err, res) => {
				if (err) {
					return done(err);
				}

				User.findById(users[1]._id)
					.then((user) => {
						expect(user.tokens.length).toBe(0);
						done();
					})
					.catch((e) => done(e));
			});
	});
});

describe('DELETE /users/me/token', () => {
	it('should remove auth token on logout', (done) => {
		request(app)
			.delete('/users/me/token')
			.set('x-auth', users[0].tokens[0].token)
			.expect(200)
			.end((err, res) => {
				if (err) {
					return done(err);
				}

				User.findById(users[0]._id)
					.then((user) => {
						expect(user.tokens.length).toBe(0);
						done();
					})
					.catch((e) => done(e));
			});
	});
});	