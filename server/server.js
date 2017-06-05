require('./config/config');

const _ = require('lodash');
const express = require('express');
const bodyParser = require('body-parser');
const { ObjectID } = require('mongodb');

const { mongoose } = require('./db/mongoose');
const { Todo } = require('./models/todo');
const { User } = require('./models/user');
const { authenticate } = require('./middleware/authenticate');

const app = express();
const PORT = process.env.PORT;

app.use(bodyParser.json());

// Todos Endpoints
app.post('/todos', (req, res) => {
	const todo = new Todo({
		text: req.body.text
	});

	todo.save()
			.then((doc) => {
				res.send(doc);
			},
			(e) => res.status(400).send(e));
});

app.get('/todos', (req, res) => {
	Todo.find()
			.then((todos) => {
				res.send({todos});
			},
			(e) => res.status(400).send(e));
});

app.get('/todos/:id', (req, res) => {
	const id = req.params.id;

	if (!ObjectID.isValid(id)) {
		res.status(404).send();
	}

	Todo.findById(id)
			.then((todo) => {
				if (todo) {
					res.send({todo});
				} else {
					res.status(404).send();
				}
			})
			.catch((e) => res.status(400).send());
});

app.delete('/todos/:id', (req, res) => {
	const id = req.params.id;

	if (!ObjectID.isValid(id)) {
		res.status(404).send();
	}

	Todo.findByIdAndRemove(id)
			.then((todo) => {
				if (todo) {
					res.send({todo});
				} else {
					res.status(404).send();
				}
			})
			.catch((e) => res.status(400).send());
});

app.patch('/todos/:id', (req, res) => {
	const id = req.params.id;
	const body = _.pick(req.body, ['text', 'completed']);

	if (!ObjectID.isValid(id)) {
		res.status(404).send();
	}

	if (_.isBoolean(body.completed) && body.completed) {
		body.completedAt = new Date().getTime();
	} else {
		body.completed = false;
		body.completedAt = null;
	}

	Todo.findByIdAndUpdate(id, {$set: body}, {new: true})
			.then((todo) => {
				if (!todo) {
					res.status(404).send();
				}

				res.send({todo});
			})
			.catch((e) => res.status(400).send());
});

// Users Endpoints
app.post('/users', (req, res) => {
	const body = _.pick(req.body, ['email', 'password']);
	
	const user = new User({ 
		email: body.email, 
		password:body.password
	});

	user.save()
			.then(() => {
				return user.generateAuthToken();
			})
			.then((token) => {
				res.header('x-auth', token).send(user);
			})
			.catch((e) => res.status(400).send(e));
});


app.get('/users/me', authenticate, (req, res) => {
	res.send(req.user);
});

// User login route
app.post('/users/login', (req, res) => {
	const body = _.pick(req.body, ['email', 'password']);

	User.findByCredentials(body.email, body.password)
		.then((user) => { 
			return user.generateAuthToken()
								 .then((token) => res.header('x-auth', token).send(user));
		})
		.catch((e) => res.status(400).send(e));
});

app.listen(PORT, () => console.log(`Started on port ${PORT}.....`));

module.exports = { app };