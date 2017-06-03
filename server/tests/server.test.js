const expect = require('expect');
const request = require('supertest');
const { ObjectID } = require('mongodb');

const { app } = require('./../server');
const { Todo } = require('./../models/todo');

const todos = [
	{ _id: new ObjectID(), text: 'Write test suite' },
	{ _id: new ObjectID(), text: 'Feed the cat' }
];

beforeEach((done) => {
	Todo.remove({})
			.then(() => {
				return Todo.insertMany(todos);
			})
			.then(() => done());
});

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