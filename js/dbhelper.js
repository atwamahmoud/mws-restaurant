/**
 * Common database helper functions & other helper functions as well.
 */

 // TODO: Reduce redundancy of the code by using a single function for both reviews & restaurants.
class DBHelper {
  /**
   * Database URL.
   */
  static get RESTAURANT_DATABASE_URL() {
    return 'http://localhost:1337/restaurants';
  }

  static get REVIEWS_DATABASE_URL() {
    return 'http://localhost:1337/reviews/'
  }

  static get IDB_VERSION(){
    return 1;
  }

  static get IDB_NAME(){
    return 'restaurants';
  }

  static get FETCHED_RESTAURANTS_REVIEWS(){
    return localStorage.getItem('fetch-reviews');
  }

  static AddFetchedReview(restaurant_id) {
    if(!DBHelper.FETCHED_RESTAURANTS_REVIEWS){
      localStorage.setItem('fetch-reviews', JSON.stringify([restaurant_id]));
    }else{
      let arr = JSON.parse(DBHelper.FETCHED_RESTAURANTS_REVIEWS);
      arr.push(restaurant_id);
      localStorage.setItem('fetch-reviews', JSON.stringify(arr));
    }
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
    return navigator.serviceWorker.register('sw.js');
  }



  static openDB(){
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DBHelper.IDB_NAME, DBHelper.IDB_VERSION);
      req.onupgradeneeded = (e) => {
        const currentVersion = e.oldVersion;
        const db = req.result;//Or just req.result

        switch(currentVersion){
          case 0:
            db.createObjectStore('restaurants', {keyPath: 'name'});
            db.createObjectStore('reviews', {keyPath: 'updatedAt'});
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
          resolve(e.target.result);
        }
        req.onerror = e => {
          reject(e.target);
        }
      })
    })
    .catch(err => {console.error(err)});
  }

  static getCachedReviews(){
    return DBHelper.openDB()
    .then(db => {
      const tx = db.transaction('reviews');
      const store = tx.objectStore('reviews');
      const req = store.getAll();
      return new Promise((resolve, reject) => {
        req.onsuccess = e => {
          resolve(e.target.result);
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
        const req = store.put(restaurant);
      }
    })
  }

  static addFailedReview(review){
    return caches.open('failed-requests').then(cache => {
      const resp = new Response(JSON.stringify(review), {type: 'application/json'})
      cache.put(review.url, resp);
    })
  }

  static addReviews(reviews, isResponse = false){
    return DBHelper.openDB()
    .then(db => {
      const tx = db.transaction('reviews', 'readwrite');
      const store = tx.objectStore('reviews');
      for(const review of reviews){
        if(isResponse) {
          const updateTime = new Date(review.updatedAt) 
          review.updatedAt = updateTime.getTime();
        } 
        const req = store.put(review);
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
      else return fetch(DBHelper.RESTAURANT_DATABASE_URL);
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
        DBHelper.addRestaurants(restaurants).then(_ => callback(null, restaurants.reverse()));
    })
  }

  /**
  * Adds the 30 built-in reviews to show them to the user when (s)he's Offline
  */

  static fetchAndAddBuiltInReviews(callback) {
    return DBHelper.getCachedReviews().then(reviews => {
        //Since 30 is the number of built-in reviews.
        //It's also notable that if the user didn't download the built-in reviews,
        //But has downloaded more than 30 review.
        //The application won't download any extra reviews to save both bandwidth and storage in the IDB.
        if(reviews.length > 30) return reviews;
        return fetch(DBHelper.REVIEWS_DATABASE_URL);
    }).then(resp => {
      if(resp.status === undefined) return resp;
      else if(resp.status === 200) return resp.json();
      else {
        const error = (`Request failed. Returned status of ${resp.status}`);
        callback(error, null);
      }
    }).then(reviews => {
      if(reviews)
        DBHelper.addReviews(reviews).then(_ => callback(null, reviews));
    })
  }

  static fetchReviews(callback, restaurant_id = 0) {
    return DBHelper.getCachedReviews().then(reviews => {
      if(restaurant_id > 0){
        return fetch(DBHelper.REVIEWS_DATABASE_URL + `?restaurant_id=${restaurant_id}`);
      }
      else{
        if(reviews.length > 0) return reviews;
        return fetch(DBHelper.REVIEWS_DATABASE_URL);
      }
    }).then(resp => {
      if(resp.status === undefined) return resp;
      else if(resp.status === 200) return resp.json();
      else {
        const error = (`Request failed. Returned status of ${resp.status}`);
        callback(error, null);
      }
    }).then(reviews => {
      if(reviews)
        DBHelper.addReviews(reviews).then(_ => callback(null, reviews.reverse()));
    }).catch(err => {
      //Fallback to the saved reviews.
      console.error(err);
       DBHelper.getCachedReviews().then(reviews => callback(null, reviews.reverse()));
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

  static fetchReviewsByRestaurantId(id, callback) {
    const fetchedRestaurants = DBHelper.FETCHED_RESTAURANTS_REVIEWS;
    let idToBePassed = id;
    if(!fetchedRestaurants || !fetchedRestaurants.includes(id)) {
      DBHelper.AddFetchedReview(id);
    }else idToBePassed = 0;
    // fetch all restaurants with proper error handling.
    DBHelper.fetchReviews((error, reviews) => {
      if (error) {
        callback(error, null);
      } else {
        let reviewsArray = reviews.filter(r => {
          return r.restaurant_id == id;
        });
        if (reviewsArray) { // Got the restaurant
          callback(null, reviewsArray);
        } else { // Restaurant does not exist in the database
          callback('Restaurant does not exist', null);
        }
      }
    }, idToBePassed);
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
    if(!restaurant.photograph) return './img/webp/notAvailable.webp';

    return (`./img/webp/${restaurant.photograph}.webp`);
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
