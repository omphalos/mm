#!/usr/bin/env node

var repl = require('repl')
  , fs = require('fs')
  , cliArgs = process.argv.slice(2)
  , db = {}
  , current
  , lastAdded
  , fileName = 'db.json'

var commands = {

  add: function add(args) {
    args.forEach(function createArg(arg) {
      db[arg] = db[arg] || []
      lastAdded = arg
      if(!current) return
      db[current].push(arg)
      db[arg].push(current)
    })
  },

  clear: function clear() {
    db = {}
    current = null
    lastAdded = null
    console.log('cleared')
  },

  create: function create() {
    commands.add.apply(this, arguments)
  },

  'delete': function del(args) {
    args.forEach(function delArg(arg) {
      Object.keys(db).forEach(function delFromKey(key) {
        var index = db[key].indexOf(arg)
        if(index >= 0) {
          console.log('deleting ' + arg + ' from ' + key)
          db[key].splice(index, 1)
        }
      })
    })
    return args.
      filter(function dbHas(arg) {
        return db.hasOwnProperty(arg)
      }).
      map(function removearg(arg) {
        console.log('deleting ' + arg)
        delete db[arg]
        if(current === arg) current = void 0
      }).
      length
  },

  goto: function goto(args) {
    args = args.length || !lastAdded ? 
      args : 
      [lastAdded]
    args.forEach(function gotoArg(arg) {
      if(db[arg]) return current = arg
    })
    return commands.query()
  },

  help: function help() {
    console.log('commands are:\r\n' + 
      Object.keys(commands).join('\r\n'))
  },

  list: function list() {
    var result = {}
    Object.
      keys(db).
      sort().
      map(function mapKey(key) {
        result[key] = db[key].length
      })
    return result
  },

  load: function load(args) {
    fileName = args[0] || fileName || 'db.json'
    var file = fs.readFileSync(fileName)
      , obj = JSON.parse(file)
    db = obj.db
    current = obj.current
    lastAdded = obj.lastAdded
    console.log(
      'loaded ' + fileName + 
      ', current is ' + current)
  },

  query: function query() {
    return {
      contents: current ? db[current] : void 0,
      current: current
    }
  },

  remove: function remove() {
    commands['delete'].apply(this, arguments)
  },

  exit: function exit() {
    process.exit(0)
  }
}

fileName = cliArgs[0] || fileName
commands.load([fileName])

repl.start({
  prompt: 'mm> ',
  eval: mmEval,
  ignoreUndefined: true
})

function mmEval(cmd, context, file, callback) {

  var clean = cmd.slice(1, cmd.length - 1)

  var parts =
    clean.
    split(/[\s,]+/).
    filter(id)

  if(!parts[0]) return callback()

  var command = findCommand(parts[0])

  if(!command.length) {
    return callback('unknown command ' + parts[0])
  }

  if(command.length > 1) {
    return callback(
      'ambiguous command, pick one of ' + 
        command.join(', '))
  }

  command = command[0]

  var result = command.call(null, parts.slice(1))
  save()

  callback(null, result);
}

function id(x) { return x }

function findCommand(cmd) {

  var matches = Object.
    keys(commands).
    filter(isMatch);

  function isMatch(candidate) {
    return !candidate.indexOf(cmd)
  }

  if(matches.length === 2) return matches;

  return matches.map(selectKey)

  function selectKey(key) {
    return commands[key]
  }
}

function save() {
  var json = JSON.stringify({
    db: db,
    current: current,
    lastAdded: lastAdded
  })
  fs.writeFileSync(fileName, json)
  //console.log('saved ' + fileName)
}
