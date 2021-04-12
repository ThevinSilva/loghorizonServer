/**
 * @typedef { Object } user
 * @property { string } id
 * @property { string } name
 * @property { string } room
 */

/**
 * volatile store of all the user objects
 * @type {Array<user>}
 */
const users = [];

/**
 *adds room object to users Array
 *@param {user} user user object
 *@return {{user: !user | string }} if room doesn't exist returns room else false
 */
const addUser = ({ id, name, room }) => {
  name = name.trim().toLowerCase();
  room = room;

  /**
   * searches the users list for given room object
   * @type {boolean}
   */
  const exsistingUsers = users.find(
    /** @bug 0000 */
    (user) => user.room === room && user.id === id
  );

  if (exsistingUsers) {
    return "Username is taken";
  }
  console.log(`\n ${users}\n`);
  const user = { id, name, room };

  users.push(user);

  return { user };
};

/**
 * removes user from a room
 * @param { string } id unique google API id given to each user
 * @return { user | undefined } user object that was deleted
 */
const removeUser = (id) => {
  const index = users.findIndex((user) => user.id === id);

  if (index !== -1) {
    return users.splice(index, 1)[0];
  }
};

/**
 * finds object in users with given google API id
 * @param {string} id unique google API id given to each user
 * @return {user}
 */
const getUser = (id) => users.find((user) => user.id === id);

/**
 * finds user objects that belong to the same room
 * @param {number} room number assigned to the room
 * @return {Array<user>}
 */
const getUserInRoom = (room) => users.filter((user) => user.room === room);

module.exports = { addUser, removeUser, getUser, getUserInRoom };
