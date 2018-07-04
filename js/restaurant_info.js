let restaurant;
var map;


/**
 * Initialize Google map, called from HTML.
 */
window.initMap = () => {
  fetchRestaurantFromURL((error, restaurant) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      self.map = new google.maps.Map(document.getElementById('map'), {
        zoom: 16,
        center: restaurant.latlng,
        scrollwheel: false
      });
      fillBreadcrumb();
      DBHelper.mapMarkerForRestaurant(self.restaurant, self.map);
    }
  });
}

/**
 * Get current restaurant from page URL.
 */
fetchRestaurantFromURL = (callback) => {
  if (self.restaurant) { // restaurant already fetched!
    callback(null, self.restaurant)
    return;
  }else{
    self.restaurant = {};
  }
  const id = getParameterByName('id');
  if (!id) { // no id found in URL
    error = 'No restaurant id in URL';
    callback(error, null);
  } else {
    DBHelper.fetchRestaurantById(id, (error, restaurant) => {
      self.restaurant = restaurant;
      if (!restaurant) {
        console.error(error);
        return;
      }

      DBHelper.fetchReviewsByRestaurantId(id, (error, reviews) => {
        self.restaurant.reviews = reviews;
        fillRestaurantHTML();
        callback(null, restaurant);
      });

    });
  }
}

/**
 * Create restaurant HTML and add it to the webpage
 */
fillRestaurantHTML = (restaurant = self.restaurant) => {
  const name = document.getElementById('restaurant-name');
  name.innerHTML = restaurant.name;
  // name.setAttribute('aria-label', restaurant.name);

  const address = document.getElementById('restaurant-address');
  address.innerHTML = restaurant.address;
  address.setAttribute('aria-label', 'Address: ' + restaurant.address);

  const image = document.getElementById('restaurant-img');
  image.className = 'restaurant-img'
  image.setAttribute('data-src', DBHelper.imageUrlForRestaurant(restaurant))
  DBHelper.INTERSECTION_OBSERVER.observe(image);
  image.setAttribute('alt', 'A picture of ' + restaurant.name + ' restaurant.');

  const cuisine = document.getElementById('restaurant-cuisine');
  cuisine.innerHTML = restaurant.cuisine_type;
  cuisine.setAttribute('aria-label', 'Cuisine type: ' + restaurant.cuisine_type);

  // fill operating hours
  if (restaurant.operating_hours) {
    fillRestaurantHoursHTML();
  }
  // fill reviews
  fillReviewsHTML();
}

/**
 * Create restaurant operating hours HTML table and add it to the webpage.
 */
fillRestaurantHoursHTML = (operatingHours = self.restaurant.operating_hours) => {
  const hours = document.getElementById('restaurant-hours');
  for (let key in operatingHours) {
    const row = document.createElement('tr');

    const timeStr = operatingHours[key];
    const day = document.createElement('td');
    day.innerHTML = key;
    row.appendChild(day);

    const time = document.createElement('td');
    time.innerHTML = timeStr;
    row.appendChild(time);

    row.setAttribute('tabindex', '0');

    const label = (timeStr === "Closed") ?
      `On ${key} The restaurant is closed` :
      `On ${key} from ${timeStr.replace(/-/gi, 'to').replace(/,/gi, ' And From')}`;

    row.setAttribute('aria-label', label);

    hours.appendChild(row);
  }
}

/**
 * Create all reviews HTML and add them to the webpage.
 */
fillReviewsHTML = (reviews = self.restaurant.reviews, prepend = false) => {
  const container = document.getElementById('reviews-container');
  const title = document.createElement('h3');
  title.innerHTML = 'Reviews';  
  title.setAttribute('tabindex', '0');
  title.classList.add('section-title');

  if (!reviews) {
    const noReviews = document.createElement('p');
    noReviews.innerHTML = 'No reviews yet!';
    container.appendChild(noReviews);
    return;
  }
  const ul = document.getElementById('reviews-list');
  if(Array.isArray(reviews))
    reviews.forEach(review => {
      ul.appendChild(createReviewHTML(review));
    });
  else
    if(prepend) ul.prepend(createReviewHTML(reviews))
    else ul.appendChild(createReviewHTML(reviews));

  if(!prepend) {
    container.appendChild(title);
    container.appendChild(ul);
  }else{
    location.href = "#toScroll"
  }
}

/**
 * Create review HTML and add it to the webpage.
 */
createReviewHTML = (review) => {
  const li = document.createElement('li');
  const nameAndDate = document.createElement('p')
  const name = document.createElement('span');

  nameAndDate.classList.add("review-name-date");
  name.classList.add('review-customer-name');

  name.innerHTML = review.name;
  nameAndDate.appendChild(name);


  const dateObj = new Date(review.updatedAt);
  const months = ['January', 'February', 'March', 'April', 'May', 'June',
                  'July', 'August', 'September', 'October', 'November', 'December']

  const month = months[dateObj.getMonth()];
  const date = document.createElement('span');

  date.classList.add("review-date");


  date.innerHTML = `${month}, ${dateObj.getDate()}`;
  nameAndDate.appendChild(date);
  li.appendChild(nameAndDate);

  const ratingContainer = document.createElement('p');
  const rating = document.createElement('span');

  rating.classList.add("review-rate");
  ratingContainer.classList.add("review-rate-contianer");

  rating.innerHTML = `Rating: ${review.rating}`;
  li.appendChild(ratingContainer);
  ratingContainer.appendChild(rating);

  const comments = document.createElement('p');
  comments.classList.add("review-comments")
  comments.innerHTML = review.comments;
  li.appendChild(comments);

  li.setAttribute('tabindex', '0');
  li.setAttribute('aria-label', 'Customer name: ' + review.name);
  rating.setAttribute('tabindex', '0');
  date.setAttribute('tabindex', '0');
  date.setAttribute('aria-label', 'On ' + review.date);
  comments.setAttribute('tabindex', '0');

  return li;
}

/**
 * Add restaurant name to the breadcrumb navigation menu
 */
fillBreadcrumb = (restaurant=self.restaurant) => {
  const breadcrumb = document.getElementById('breadcrumb');
  const li = document.createElement('li');
  li.innerHTML = restaurant.name;
  li.setAttribute('tabindex', '0');
  li.setAttribute('aria-label', 'Slash ' + restaurant.name);
  li.setAttribute('aria-current', 'page');
  breadcrumb.appendChild(li);
}

/**
 * Get a parameter by name from page URL.
 */
getParameterByName = (name, url) => {
  if (!url)
    url = window.location.href;
  name = name.replace(/[\[\]]/g, '\\$&');
  const regex = new RegExp(`[?&]${name}(=([^&#]*)|&|#|$)`),
    results = regex.exec(url);
  if (!results)
    return null;
  if (!results[2])
    return '';
  return decodeURIComponent(results[2].replace(/\+/g, ' '));
}



/**
* Fetch the data from DOM before submit
*/
getData = _ => {
  const name = document.querySelector('.name-box').value;
  const comment = document.querySelector('.review-text').value;
  const ratings = document.querySelectorAll('input[type="radio"]');
  let rating = null;

  for(let i = 0; i<ratings.length; i++){
    if(ratings[i].checked) {
      rating = ratings[i].value;
      break;
    }
  }

  return {
    name: name,
    comment: comment,
    rating: rating,
    url: 'http://localhost:1337/reviews/',
    id: getParameterByName('id')
  };
}

/**
* Validates & send the review to server.
*/
addReview = _ => {
  const data = getData();

  
  if(!data) return;

  navigator.serviceWorker.onmessage = e => {
    fillReviewsHTML(e.data, true);//Update the UI.
    DBHelper.addReviews([e.data], true);//Save it in IDB.
  }

  sendReview(data);
}

sendReview = (data) => {

  //Sending all review through the service worker.
  //Same Idea as the outbox in Jake Archibald's example:
    //https://wicg.github.io/BackgroundSync/spec/
  DBHelper.addFailedReview(data).then(_ => {    
    return DBHelper.registerSW();//Since the registration object contains the sync object.
  }).then(reg => {    
    reg.sync.register('offline');
  })


}

(function() {
  const submitBtn = document.querySelector('#submit-btn');
  submitBtn.addEventListener('click', e => {
    e.preventDefault();//Prevents the form from submitting.
    addReview();
  })

})();
