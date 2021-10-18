const db = require('../models')
const Course = db.Course
const Teacher = db.Teacher
const Calendar = db.Calendar
const Meeting = db.Meeting
const Student = db.Student
const Diary = db.Diary
const User = db.User
const pageLimit = 10

const schoolController = {
  getSchoolIndexPage: (req, res) => {
    Promise.all([
      Meeting.findAll({ 
        raw: true,
        nest: true,
        limit: 5,
        order: [['createdAt', 'DESC']]
      }),
      Diary.findAll({ 
        raw: true,
        nest: true,
        limit: 4,
        include: [{ model: Course, include: [{ model: Teacher}] }],
        order: [['createdAt', 'DESC']]
      }),
    ]).then(([meetings, diaries]) => {
      return res.render('cramschool', { isAdmin: req.user.isAdmin, meetings: meetings, diaries: diaries})
    })
  },
  
  getIntroduction: (req, res) => {
    return res.render('introduction')
  },

  getCourses: (req, res) => {
    Promise.all([
      Course.findAll({ 
        raw: true,
        nest: true, 
        include: [ 
          { model: Teacher }
        ]
      }),
      User.findByPk(req.user.id, {
        raw: true,
        nest: true,
        include: [Teacher]
      })
    ]).then(([courses, user]) => {
      return res.render('courses', { courses: courses, isAdmin: req.user.isAdmin, user: user })
    })
  },

  getCourse: (req, res) => {
    Calendar.max('period', {
      where: {
        CourseId: req.params.id
      }
    }).then(currentPeriod => {
      if (isNaN(currentPeriod)) {
        console.log('Not found!')
        res.redirect('/cramschool/courses')
      } else {
        Course.findByPk(req.params.id, {
          include: {
            model: Calendar,
            where: { period: currentPeriod }
          },
          order: [[Calendar, 'date', 'ASC']]
        }).then(course =>{
          if (course === null) {
            console.log('Not found!')
            res.redirect('/cramschool/courses')
          } else {
            const data = course.dataValues.Calendars
            const calendars = data.map(r => ({
              ...r.dataValues
            }))
            const firstCalendarDate = calendars[0].date
            const lastCalendarDate = calendars[calendars.length -1].date
            return res.render('course', { 
              course: course.dataValues, 
              calendars: calendars,
              currentPeriod: currentPeriod, 
              firstCalendarDate: firstCalendarDate, 
              lastCalendarDate: lastCalendarDate 
            })
          }
        })
      }
    })
  },
  
  getCourseEnrolledStudents: (req, res) => {
    Course.findByPk(req.params.id, {
      include: [{ model: Student, as: 'EnrolledStudents' }]
    }).then(course => {
      if (course === null) {
        console.log('Not found!')
        res.redirect('/cramschool/courses')
      } else {
        const students = course.EnrolledStudents.map(r => ({
          ...r.dataValues
        }))
        return res.render('enrolledstudents', { 
          course: course.toJSON(), 
          students: students 
        })
      }
    })
  },

  getMeetings: (req, res) => {
    let offset = 0
    if (req.query.page) {
      offset = (req.query.page - 1) * pageLimit
    }
    Meeting.findAndCountAll({
      raw: true,
      nest: true,
      offset: offset,
      limit: pageLimit,
      order: [['createdAt', 'DESC']]
    }).then(meetings => {
      const page = Number(req.query.page) || 1
      const pages = Math.ceil(meetings.count / pageLimit)
      const totalPage = Array.from({ length: pages }).map((item, index) => index + 1)
      const prev = page - 1 < 1 ? 1 : page - 1
      const next = page + 1 > pages ? pages : page + 1
      return res.render('meetings',{ 
        meetings: meetings.rows, 
        isAdmin: req.user.isAdmin,
        page: page,
        totalPage: totalPage,
        prev: prev,
        next: next
       })
    })
  },
  
  getMeeting: (req, res) => {
    Meeting.findByPk(req.params.id, {
      raw: true,
      nest: true,
      include: [Teacher]
    }).then(meeting => {
      if (meeting === null) {
        console.log('Not found!')
        res.redirect('/cramschool/meetings')
      } else {
        return res.render('meeting',{ meeting: meeting })
      }
    })
  },

  getCreateMeetingPage: (req, res) => {
    Teacher.findOne({
      raw: true,
      nest: true,
      where: {
        UserId: req.user.id
      }
    }).then(teacher => {
      return res.render('createmeeting',{ teacher: teacher })
    })
  },

  createMeeting: (req, res) => {
    Teacher.findOne({
      raw: true,
      nest: true,
      where: {
        UserId: req.user.id
      }
    }).then(teacher => {
      return Meeting.create({
        date: req.body.date,
        subject: req.body.subject,
        content: req.body.content,
        TeacherId: teacher.id,
      })
    }).then((meeting) => {
      req.flash('success_messages', '已成功建立會議紀錄')
      return res.redirect('/cramschool')
    })
  },

  deleteMeeting: (req, res) => {
    return Meeting.findByPk(req.params.id)
      .then((meeting) => {
        meeting.destroy()
          .then((meeting) => {
            req.flash('success_messages', '已成功刪除會議記錄')
            res.redirect('/cramschool/meetings')
          })
      })
  },
  
  getDiariesList: (req, res) => {
    let offset = 0
    if (req.query.page) {
      offset = (req.query.page - 1) * pageLimit
    }
    Diary.findAndCountAll({ 
      raw: true,
      nest: true,
      include: [{ model: Course, include: [{ model: Teacher}] }],
      offset: offset,
      limit: pageLimit,
      order: [['createdAt', 'DESC']]
    }).then(diaries => {
      const page = Number(req.query.page) || 1
      const pages = Math.ceil(diaries.count / pageLimit)
      const totalPage = Array.from({ length: pages }).map((item, index) => index + 1)
      const prev = page - 1 < 1 ? 1 : page - 1
      const next = page + 1 > pages ? pages : page + 1
      return res.render('diarieslist',{ 
        diaries: diaries.rows, 
        isAdmin: req.user.isAdmin,
        page: page,
        totalPage: totalPage,
        prev: prev,
        next: next
      })
    })
  },

  deleteDiaryInList: (req, res) => {
    return Diary.findByPk(req.params.id)
      .then((diary) => {
        diary.destroy()
          .then((diary) => {
            req.flash('success_messages', '已成功刪除教師日誌')
            res.redirect('/cramschool/diaries')
          })
      })
  },

  getDiaries: (req, res) => {
    let offset = 0
    if (req.query.page) {
      offset = (req.query.page - 1) * pageLimit
    }
    Promise.all([
      Diary.findAndCountAll({
        raw: true,
        nest: true,
        where: { 
          CourseId: req.params.id
        },
        include: { model: Course, include: { model: Teacher }},
        offset: offset,
        limit: pageLimit,
        order: [['createdAt', 'DESC']]      
      }),
      Course.findByPk(req.params.id, {
        raw: true,
        nest: true
      })
    ]).then(([diaries, course]) => {
      const page = Number(req.query.page) || 1
      const pages = Math.ceil(diaries.count / pageLimit)
      const totalPage = Array.from({ length: pages }).map((item, index) => index + 1)
      const prev = page - 1 < 1 ? 1 : page - 1
      const next = page + 1 > pages ? pages : page + 1
      if (course === null) {
        console.log('Not found!')
        return res.redirect('/cramschool/courses')
      } else {
        res.render('diaries', { 
          diaries: diaries.rows, 
          course: course,
          page: page,
          totalPage: totalPage,
          prev: prev,
          next: next
        })
      }
    })
  },

  getDiary: (req, res) => {
    Diary.findOne({
      raw: true,
      nest: true,
      where: {
        id: req.params.diaryId
      },
      include: [Teacher]
    }).then(diary => {
      if (diary === null) {
        console.log('Not found!')
        return res.redirect('/cramschool/courses')
      }
      return res.render('diary', { diary: diary })
    })
  },

  getCreateDiaryPage: (req, res) => {
    Promise.all([
      Course.findByPk(req.params.id, {
        raw: true,
        nest: true,
        include: [Teacher]
      }),
      User.findByPk(req.user.id, {
        raw: true,
        nest: true,
        include: [Teacher]
      })
    ]).then(([course, user]) => {
      if (course === null || user.Teacher.id === null) {
        console.log('Not found!')
        return res.redirect('/cramschool/courses')
      } else {
        res.render('creatediary', { course: course, user: user })
      }
    })
  },

  createDiary: (req, res) => {
    Teacher.findOne({
      raw: true,
      nest: true,
      where: {
        UserId: req.user.id
      }
    }).then(teacher => {
      return Diary.create({
        date: req.body.date,
        subject: req.body.subject,
        content: req.body.content,
        TeacherId: teacher.id,
        CourseId: req.params.id,
      })
    }).then((diary) => {
      let url = '/cramschool/courses/'+ String(req.params.id) + '/diaries'
      req.flash('success_messages', '已成功建立教師日誌')
      return res.redirect(url)
    })
  },

  deleteDiary: (req, res) => {
    return Diary.findByPk(req.params.diaryId)
      .then((diary) => {
        diary.destroy()
          .then((diary) => {
            let url = '/cramschool/courses/'+ String(req.params.courseId) + '/diaries'
            req.flash('success_messages', '已成功刪除教師日誌')
            res.redirect(url)
          })
      })
  },
}
module.exports = schoolController