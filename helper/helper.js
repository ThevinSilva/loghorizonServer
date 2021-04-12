/**
 * used to format date string
 * @param {String} date mongoDB Date
 * @returns
 */
const formatAMPM = (date) => {
  var hours = date.getHours();
  var minutes = date.getMinutes();
  var ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  hours = hours ? hours : 12; // the hour '0' should be '12'
  minutes = minutes < 10 ? "0" + minutes : minutes;
  var strTime = hours + ":" + minutes + " " + ampm;
  return strTime;
};

const boardDataFormater = (data) => {
  /**
   * solve for having to refactor code in Sublist.js by changing all instances of 'username'
   * to 'name' and 'name' to 'username' and 'boardURI' to '_id'
   * @link  https://stackoverflow.com/questions/36280818/how-to-convert-file-to-base64-in-javascript
   * @param {Array} data - docs from the board collection
   * @return {Array} reformated Array
   */

  //
  return Array.from(
    data,
    ({ image, name, boardURI, participents, moderators, owner, category }) => {
      return {
        img: image,
        username: name,
        _id: boardURI,
        participents,
        moderators,
        owner,
        category,
      };
    }
  );
};

module.exports = { formatAMPM, boardDataFormater };
