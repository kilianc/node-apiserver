(function () {
  document.domain = "localhost"

  var API_URL = 'http://localhost:8080'
  var templates = {}

  window.addEvent('domready', function () {
    configureSignup()
    configureTable()
    async.waterfall([
      function (callback) {
        loadTemplate('partials/user_row.html', function (err, template) {
          templates.userRow = template
          callback()
        })
      },
      function (callback) {
        get(API_URL + '/list/0', callback)
      }
    ], function (err, users) {
      users.each(function (user) {
        templates.userRow(user).inject($('table-list'))
      })
    })
  })

  function configureSignup() {
    $('signup-form').addEvent('submit', function (e) {
      e.preventDefault()
      post(API_URL + '/signup', this, function (err, response) {
        if (response && response.success) {
          templates.userRow(response.user).inject($('table-list'))
        } else {
          alert('Error: ' + response.error)
        }
      })
    })
  }

  function configureTable() {
    $('table-list').addEvent('click:relay(.btn-danger)', function(e, el){
      e.preventDefault()
      post(API_URL + '/1/users/delete', { id: el.get('data-id') }, function (err, response) {
        if (response && response.success) {
          $(el.get('data-id')).dispose().destroy()
        } else {
          alert('Something went wrong: ' + (response && response.error))
        }
      })
    }).addEvent('click:relay(.btn-success)', function(e, el){
      e.preventDefault()
      post(API_URL + '/signin', {
        email: el.get('data-email'),
        password: el.get('data-password')
      }, function (err, response) {
        if (response && response.success) {
          alert('Signin success!')
        } else {
          alert('Something went wrong: ' + (response && response.error))
        }
      })
    }).addEvent('click:relay(.btn-info)', function(e, el){
      e.preventDefault()
      get(API_URL + '/users/' + el.get('data-id'), function (err, response) {
        if (response && response.success) {
          alert(JSON.encode(response.user))
        } else {
          alert(response && response.error)
        }
      })
    })
  }

  function addUserRow(user) {
    var buttonSignin = new Element('a', {
      'class': 'btn btn-mini btn-success',
      'text': 'signin',
      'data-email': user.email,
      'data-password': user.password
    })
    var buttonRemove = new Element('a', {
      'class': 'btn btn-mini btn-danger',
      'text': 'delete',
      'data-id': user._id
    })
    var buttonInfo = new Element('a', {
      'class': 'btn btn-mini btn-info',
      'text': 'info',
      'data-id': user._id
    })
    $$('#table-list tbody').adopt(new Element('tr', { id: user._id }).adopt(
      new Element('td', { text: user._id }),
      new Element('td', { text: user.email }),
      new Element('td', { text: user.password }),
      new Element('td').adopt(buttonSignin).adopt(buttonInfo).adopt(buttonRemove)
    ), 'top')
  }
})()