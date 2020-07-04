const axios = require('axios');
const winston = require('winston');

module.exports = {
  fetchCourse: fetchCourse,
  fetchCourses: fetchCourses,
  fetchAssignment: fetchAssignment,
  fetchAssignments: fetchAssignments,
}

const { canvasDomain, canvasToken } = require('../config.json');

const session = axios.create({
  baseURL: canvasDomain,
  timeout: 10000,
  headers: {
    Authorization: `Bearer ${canvasToken}`,
    Accept: 'application/json+canvas-string-ids',
  },
  proxy: false
});

/**
 * Fetches and returns an array of Course objects of active courses from
 * Canvas from the respective token-holder. Throws during HTTP errors.
 * @return {Promise<Object[]>} An array of Canvas course objects from active
 *    courses
 */
async function fetchCourses() {
  // TODO: Figure out how others will fetch their courses with OAuth2
  const res = await session.get('api/v1/courses/?enrollment_state=active');
  return res.data;
}

/**
 * Fetches and returns a Course object holding information about the given
 * course from Canvas, only if it is **not** concluded. Throws during HTTP
 * errors or if there's no valid course.
 * @param {number} courseID The Canvas course ID
 * @return {Promise<Object>} The Course object with course information
 */
async function fetchCourse(courseID) {
  // TODO: Figure out how others will fetch their course with OAuth2
  const res = await session.get(`api/v1/courses/${courseID}?include[]=concluded`);
  return res.data;
}

/**
 * Fetches and returns an array of Assignment objects of upcoming assignments
 * from the given course. Throws during HTTP errors.
 * @param {number} courseID The Canvas course ID to get upcoming/due assignments
 *    from
 * @return {Promise<Object[]>} An array of Assignment objects of upcoming/due
 *    assignments
 */
async function fetchAssignments(courseID) {
  const res = await session.get(`api/v1/courses/${courseID}/assignments/?bucket=upcoming`);
  return res.data;
}

/**
 * Fetches and returns an Assignment object containing information about the
 * given specified assingment, if it exists. Throws during HTTP errors or if
 * the assignment does not exist.
 * @param {number} courseID The Canvas course ID
 * @param {number} assignID The Assignment ID in the course
 * @return {Promise<Object>} The assignment's Assignment object
 */
async function fetchAssignment(courseID, assignID) {
  const res = await session.get(`api/v1/courses/${courseID}/assignments/${assignID}`);
  return res.data;
}