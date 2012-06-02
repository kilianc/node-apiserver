(function () {
  document.domain = "localhost"

  var API_URL = 'http://localhost:8080'
  var templates = {}

  window.addEvent('domready', function () {
    configureUpload()
    configureFeed()
    async.waterfall([
      function (callback) {
        loadTemplate('partials/photo.html', function (err, template) {
          templates.photo = template
          callback()
        })
      },
      function (callback) {
        get(API_URL + '/photos', callback)
      }
    ], function (err, photos) {
      photos.each(function (photo) {
        templates.photo(photo).inject($('photo-feed'))
      })
    })
  })

  function configureUpload() {
    $('upload-photo-button').addEvent('click', function (e) {
      $('upload-photo-file').click()
    })
    $('upload-photo-form').addEvent('change:relay(#upload-photo-file)', function (e) {
      post(API_URL + '/photos', $('upload-photo-form'), function (err, response) {
        templates.photo(response.photo).inject($('photo-feed'), 'top')
      })
    })
  }

  function configureFeed() {
    $('photo-feed').addEvent('click:relay(.delete)', function (e, el) {
      e.preventDefault()
      post(API_URL + '/photos/' + el.get('data-id') + '?action=delete', function (err, response) {
        if (response && response.success) {
          $(el.get('data-id')).dispose().destroy()
        } else {
          alert('Something went wrong: ' + (response && response.error))
        }
      })
    }).addEvent('click:relay(.like)', function(e, el){
      e.preventDefault()
      post(API_URL + '/photos/' + el.get('data-id') + '?action=put', function (err, response) {
        if (response && response.success) {
          el.getLast().set('text', response.photo.likes)
        } else {
          alert('Something went wrong: ' + (response && response.error))
        }
      })
    })
  }
})()