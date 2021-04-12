/**
 * @implements {Object}
 * @exports
 */
class BoardManager {
  constructor() {
    /**
     * @desc hash map that maps all users to boardURI
     * @private @type {Object< string, number> }} */
    this._data = new Object();
  }

  //----------------------------------  ACCESSORS ----------------------------------

  /**
   * checks whether the board exists in this._data
   * @param {string} boardURI unique identifier for each board
   * @return {boolean}
   * @private
   */
  _boardExists(boardURI) {
    return boardURI in this._data;
  }

  /**
   * checks whether the user exists in the given board
   * @param {string} boardURI unique identifier for each board
   * @param {string} userID google API id
   * @return {boolean}
   */
  userExists(boardURI, userID) {
    return this._data[boardURI].has(userID);
  }

  /**
   * returns the users that are under a certain boardURI
   * @param {string} boardURI unique identifier for each board
   * @return {Array}
   */
  getUsers(boardURI) {
    return this._boardExists(boardURI) ? Array.from(this._data[boardURI]) : [];
  }

  //----------------------------------  MUTATORS ----------------------------------

  /**
   * pushes userId under given boardURI
   * @param {string} boardURI unique identifier for each board
   * @param {string} userID google API id
   */
  addUser(boardURI, userID) {
    if (this._boardExists(boardURI)) {
      this._data[boardURI].add(userID); // same user accesing the page in two different instances should have no effect
      console.log(`\n ${userID} just joined ${boardURI} \n`);
    } else {
      this._data[boardURI] = new Set().add(userID);
      console.log(`\n BOARD WAS CREATED : ${boardURI} \n`);
      console.log(`\n ${userID} just joined ${boardURI} \n`);
    }
  }

  /**
   * removes userID from given boardURI
   * @param {string} boardURI unique identifier for each board
   * @param {string} userID google API id
   */
  removeUser(boardURI, userID) {
    if (this.userExists(boardURI)) this._data.remove(userID);
  }
}

module.exports = new BoardManager();
