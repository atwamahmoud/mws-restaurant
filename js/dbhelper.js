/**
 * Common database helper functions & other helper functions as well.
 */
class DBHelper {

  /**
   * Database URL.
   */
  static get DATABASE_URL() {
    return 'http://localhost:1337/restaurants';
  }

  static get IDB_VERSION(){
    return 1;
  }

  static get IDB_NAME(){
    return 'restaurants';
  }
  
  /**
   * Returns an IntersectionObserver object.
   * Implemented after following Jeremy Wagner's article/guide. 
   * https://developers.google.com/web/fundamentals/performance/lazy-loading-guidance/images-and-video/
   */
  static get INTERSECTION_OBSERVER() {
    const observer =  new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          let img = entry.target;
          img.setAttribute('src', img.getAttribute('data-src'));
          observer.unobserve(img);
        }
      }
    })
    return observer;
  }

  static registerSW(){
    if(navigator.serviceWorker) 
      navigator.serviceWorker.register('sw.js');
  }

  

  static openDB(){
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DBHelper.IDB_NAME, DBHelper.IDB_VERSION);
      req.onupgradeneeded = (e) => {
        const currentVersion = e.oldVersion;
        const db = req.result;//Or just req.result

        switch(currentVersion){
          case 0:
            const store = db.createObjectStore('restaurants', {keyPath: 'name'});
            const cuisineIndex = store.createIndex('cuisine', 'cuisine_type');
            e.target.transaction.complete;
        }
        db.onsuccess = e => {
          resolve(db);
        }
        db.onerror = e => {
          reject(e.target)
        }
      }
      req.onerror = e => {
        reject(e.target)
      }
      req.onsuccess = (e) => {
        resolve(req.result);
      }
    })  
  }

  static getCachedRestaurants(){
    return DBHelper.openDB()
    .then(db => {
      const tx = db.transaction('restaurants');
      const store = tx.objectStore('restaurants');
      const req = store.getAll();
      return new Promise((resolve, reject) => {
        req.onsuccess = e => {
          resolve(e.target.result.reverse());
        }
        req.onerror = e => {
          reject(e.target);
        }
      })
    })
    .catch(err => {console.error(err)});
  }

  static addRestaurants(restaurants){
    return DBHelper.openDB()
    .then(db => {
      const tx = db.transaction('restaurants', 'readwrite');
      const store = tx.objectStore('restaurants');
      for(const restaurant of restaurants){
        const req = store.add(restaurant);
      }
    })
  }
  /**
   * Fetch all restaurants.
   * ////////////////////////////
   * Service Worker is registered here, 
   * Since such function is the first to be called,
   * In all of the scripts.
   */
  static fetchRestaurants(callback) {
    this.registerSW();
    return DBHelper.getCachedRestaurants().then(restaurants => {
      if(restaurants.length > 0) return restaurants;
      else return fetch(DBHelper.DATABASE_URL);
    }).then(resp => {
      // Since, [].status === undefined.
      // Thus, I'm checking if the list of the restraunts are returned.
      // And not the network response.
      if(resp.status === undefined) return resp; 
      else if(resp.status === 200) return resp.json();
      else {
        const error = (`Request failed. Returned status of ${resp.status}`);
        callback(error, null);
      }
    }).then(restaurants => {
      if(restaurants)
        DBHelper.addRestaurants(restaurants).then(_ => callback(null, restaurants));
    })
  }

  /**
   * Fetch a restaurant by its ID.
   */
  static fetchRestaurantById(id, callback) {
    // fetch all restaurants with proper error handling.
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        const restaurant = restaurants.find(r => r.id == id);
        if (restaurant) { // Got the restaurant
          callback(null, restaurant);
        } else { // Restaurant does not exist in the database
          callback('Restaurant does not exist', null);
        }
      }
    });
  }

  /**
   * Fetch restaurants by a cuisine type with proper error handling.
   */
  static fetchRestaurantByCuisine(cuisine, callback) {
    // Fetch all restaurants  with proper error handling
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given cuisine type
        const results = restaurants.filter(r => r.cuisine_type == cuisine);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a neighborhood with proper error handling.
   */
  static fetchRestaurantByNeighborhood(neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given neighborhood
        const results = restaurants.filter(r => r.neighborhood == neighborhood);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a cuisine and a neighborhood with proper error handling.
   */
  static fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        let results = restaurants
        if (cuisine != 'all') { // filter by cuisine
          results = results.filter(r => r.cuisine_type == cuisine);
        }
        if (neighborhood != 'all') { // filter by neighborhood
          results = results.filter(r => r.neighborhood == neighborhood);
        }
        callback(null, results);
      }
    });
  }

  /**
   * Fetch all neighborhoods with proper error handling.
   */
  static fetchNeighborhoods(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all neighborhoods from all restaurants
        const neighborhoods = restaurants.map((v, i) => restaurants[i].neighborhood)
        // Remove duplicates from neighborhoods
        const uniqueNeighborhoods = neighborhoods.filter((v, i) => neighborhoods.indexOf(v) == i)
        callback(null, uniqueNeighborhoods);
      }
    });
  }

  /**
   * Fetch all cuisines with proper error handling.
   */
  static fetchCuisines(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all cuisines from all restaurants
        const cuisines = restaurants.map((v, i) => restaurants[i].cuisine_type)
        // Remove duplicates from cuisines
        const uniqueCuisines = cuisines.filter((v, i) => cuisines.indexOf(v) == i)
        callback(null, uniqueCuisines);
      }
    });
  }

  /**
   * Restaurant page URL.
   */
  static urlForRestaurant(restaurant) {
    return (`./restaurant.html?id=${restaurant.id}`);
  }

  /**
   * Restaurant image URL.
   */
  static imageUrlForRestaurant(restaurant) {
    if(!restaurant.photograph) return './img/notAvailable.jpg';
    
    return (`./img/${restaurant.photograph}.jpg`);
  }

  /**
   * Map marker for a restaurant.
   */
  static mapMarkerForRestaurant(restaurant, map) {
    const marker = new google.maps.Marker({
      position: restaurant.latlng,
      title: restaurant.name,
      url: DBHelper.urlForRestaurant(restaurant),
      map: map,
      animation: google.maps.Animation.DROP}
    );
    return marker;
  }

}
