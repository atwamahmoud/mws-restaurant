let restaurants,
  neighborhoods,
  cuisines
var map
var markers = []
/**
 * Fetch neighborhoods and cuisines as soon as the page is loaded.
 */
document.addEventListener('DOMContentLoaded', (event) => {
  fetchNeighborhoods();
  fetchCuisines();
  DBHelper.fetchAndAddBuiltInReviews(_ => {
    console.log('Built-in reviews are added');
  });
});
/**
 * Register a service worker as sw.js with a default scope level of '/'
 */

/**
 * Fetch all neighborhoods and set their HTML.
 */
fetchNeighborhoods = () => {
  DBHelper.fetchNeighborhoods((error, neighborhoods) => {
    if (error) { // Got an error
      console.error(error);
    } else {
      self.neighborhoods = neighborhoods;
      fillNeighborhoodsHTML();
    }
  });
}

/**
 * Set neighborhoods HTML.
 */
fillNeighborhoodsHTML = (neighborhoods = self.neighborhoods) => {
  const select = document.getElementById('neighborhoods-select');
  neighborhoods.forEach(neighborhood => {
    const option = document.createElement('option');
    option.innerHTML = neighborhood;
    option.value = neighborhood;
    select.append(option);
  });
}

/**
 * Fetch all cuisines and set their HTML.
 */
fetchCuisines = () => {
  DBHelper.fetchCuisines((error, cuisines) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      self.cuisines = cuisines;
      fillCuisinesHTML();
    }
  });
}

/**
 * Set cuisines HTML.
 */
fillCuisinesHTML = (cuisines = self.cuisines) => {
  const select = document.getElementById('cuisines-select');

  cuisines.forEach(cuisine => {
    const option = document.createElement('option');
    option.innerHTML = cuisine;
    option.value = cuisine;
    select.append(option);
  });
}

/**
 * Initialize Google map, called from HTML.
 */
window.initMap = () => {
  let loc = {
    lat: 40.722216,
    lng: -73.987501
  };
  self.map = new google.maps.Map(document.getElementById('map'), {
    zoom: 12,
    center: loc,
    scrollwheel: false
  });
  updateRestaurants();
}

/**
 * Update page and map for current restaurants.
 */
updateRestaurants = () => {
  const cSelect = document.getElementById('cuisines-select');
  const nSelect = document.getElementById('neighborhoods-select');

  const cIndex = cSelect.selectedIndex;
  const nIndex = nSelect.selectedIndex;

  const cuisine = cSelect[cIndex].value;
  const neighborhood = nSelect[nIndex].value;

  DBHelper.fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, (error, restaurants) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      resetRestaurants(restaurants);
      fillRestaurantsHTML();
    }
  })
}

/**
 * Clear current restaurants, their HTML and remove their map markers.
 */
resetRestaurants = (restaurants) => {
  // Remove all restaurants
  self.restaurants = [];
  const ul = document.getElementById('restaurants-list');
  ul.innerHTML = '';

  // Remove all map markers
  self.markers.forEach(m => m.setMap(null));
  self.markers = [];
  self.restaurants = restaurants;
}

/**
 * Create all restaurants HTML and add them to the webpage.
 */
fillRestaurantsHTML = (restaurants = self.restaurants) => {
  const ul = document.getElementById('restaurants-list');
  restaurants.forEach(restaurant => {
    ul.append(createRestaurantHTML(restaurant));
  });
  addMarkersToMap();
}

/**
 * Create restaurant HTML.
 */
createRestaurantHTML = (restaurant) => {
  const li = document.createElement('li');
  const figure = document.createElement('figure');
  const figCaption = document.createElement('figcaption');

  figure.className = "restaurant-figure";
  figCaption.className = "restaurant-figure-caption"

  const image = document.createElement('img');
  image.className = 'restaurant-img';
  image.setAttribute('data-src', DBHelper.imageUrlForRestaurant(restaurant));
  DBHelper.INTERSECTION_OBSERVER.observe(image);
  const alt = (restaurant.photograph) ?
    `A picture of ${restaurant.name} restaurant.` :
    'No available image for this restaurant.'



  image.setAttribute('alt', alt);
  figure.append(image);

  const name = document.createElement('h2');
  name.innerHTML = restaurant.name;
  figCaption.append(name);

  const neighborhood = document.createElement('p');
  neighborhood.innerHTML = restaurant.neighborhood;
  figCaption.append(neighborhood);

  const address = document.createElement('p');
  address.innerHTML = restaurant.address;
  figCaption.append(address);


  const more = document.createElement('a');
  more.innerHTML = 'View Details';
  more.href = DBHelper.urlForRestaurant(restaurant);
  figCaption.append(more);

  const fav = document.createElement('button');
  fav.innerHTML = '★';
  fav.classList.add('fav-btn');
  fav.addEventListener('click', e => {
    console.log(e.target);
    e.target.classList.toggle('actual-fav');
    addToFav(restaurant);
  })
  if(restaurant.is_favorite !== "false" && restaurant.is_favorite)
    fav.classList.add('actual-fav');

  figCaption.append(fav);

  figure.append(figCaption);
  li.appendChild(figure);

  li.setAttribute('tabindex', '0');
  li.setAttribute('aria-label', restaurant.name);
  image.setAttribute('tabindex', '0');
  address.setAttribute('tabindex', '0');
  neighborhood.setAttribute('tabindex', '0');

  neighborhood.setAttribute('aria-label', 'Neighborhood: ' + restaurant.neighborhood);
  address.setAttribute('aria-label', 'Address: ' + restaurant.address);

  return li;
}

/**
 * Add markers for current restaurants to the map.
 */
addMarkersToMap = (restaurants = self.restaurants) => {
  restaurants.forEach(restaurant => {
    // Add marker to the map
    const marker = DBHelper.mapMarkerForRestaurant(restaurant, self.map);
    google.maps.event.addListener(marker, 'click', () => {
      window.location.href = marker.url;
    });
    self.markers.push(marker);
  });
}

/**
 * Add Observers for lazy loading.
 * TODO:: make it browser-compatible.
 */
addObservers = () => {
  const observer = new IntersectionObserver(entries => {
    for (entry of entries) {
      if (entry.isIntersecting) {
        //change let to const.
        //You're changing the element not its reference is the script.
        let img = entry.target;
        img.setAttribute('src', img.getAttribute('data-src'));
        observer.unobserve(img);
      }
    }
  })

  const imgs = document.getElementsByClassName('restaurant-img');
  for (let i = 0; i<imgs.length; i++) {
    observer.observe(imgs[i]);
  }
}

/**
* toggles the restaurant's favourite state, And updates it in the IDB.
*/

addToFav = (restaurant) => {
  const isFav = (restaurant.is_favorite !== "false" && restaurant.is_favorite) ? false : true;
  const url = `http://localhost:1337/restaurants/${restaurant.id}/?is_favorite=${isFav}`;

  console.log(url);

  return fetch(url, {
    method: 'PUT'
  })
  .then(resp => resp.json())
  .then(resp => {
    return DBHelper.addRestaurants([resp]);
  }).catch(err => {
    console.error(err);
  })
}
