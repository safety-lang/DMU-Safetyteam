const FACILITY_SHARED_CALENDAR_ID = 'c_04b42241eb38f7f266a3bb553557a109b5ec69bdf42888d195c106f7de81f36c@group.calendar.google.com';
const FACILITY_SHARED_TASKLIST_TITLE = '시설관리팀 공유 일정';
const TASKLIST_ID_PROPERTY = 'FACILITY_SHARED_TASKLIST_ID';
const TASKS_API_BASE_URL = 'https://tasks.googleapis.com/tasks/v1';
const EXPECTED_EXECUTION_ACCOUNT = 'rhs@dongyang.ac.kr';
const TIME_ZONE = 'Asia/Seoul';

function doGet() {
  try {
    const calendar = CalendarApp.getCalendarById(FACILITY_SHARED_CALENDAR_ID);
    const taskList = getOrCreateFacilityTaskList_();
    const hasSecret = Boolean(PropertiesService.getScriptProperties().getProperty('WEBHOOK_SECRET'));

    return jsonResponse({
      ok: Boolean(taskList),
      service: 'DMU facility shared Google Tasks webhook',
      calendarId: FACILITY_SHARED_CALENDAR_ID,
      taskListTitle: FACILITY_SHARED_TASKLIST_TITLE,
      taskListId: taskList && taskList.id,
      expectedExecutionAccount: EXPECTED_EXECUTION_ACCOUNT,
      executionAccount: getExecutionAccount_(),
      calendarAccess: Boolean(calendar),
      tasksAccess: Boolean(taskList),
      webhookSecretRequired: hasSecret,
      message: taskList
        ? '시설관리팀 공유 일정 할 일 목록 접근이 확인되었습니다.'
        : '시설관리팀 공유 일정 할 일 목록을 준비할 수 없습니다. rhs@dongyang.ac.kr 계정으로 배포했는지 확인해 주세요.',
    });
  } catch (error) {
    return jsonResponse({
      ok: false,
      service: 'DMU facility shared Google Tasks webhook',
      calendarId: FACILITY_SHARED_CALENDAR_ID,
      taskListTitle: FACILITY_SHARED_TASKLIST_TITLE,
      expectedExecutionAccount: EXPECTED_EXECUTION_ACCOUNT,
      executionAccount: getExecutionAccount_(),
      calendarAccess: false,
      tasksAccess: false,
      error: String(error && error.message ? error.message : error),
    });
  }
}

function doPost(e) {
  try {
    const payload = JSON.parse((e.postData && e.postData.contents) || '{}');
    validateSecret_(payload.secret || '');

    const task = payload.task;
    if (!task || !task.id || !task.title) {
      throw new Error('업무지정 데이터가 없습니다.');
    }

    const taskList = getOrCreateFacilityTaskList_();
    if (!taskList || !taskList.id) {
      throw new Error('시설관리팀 공유 일정 할 일 목록을 준비할 수 없습니다. rhs@dongyang.ac.kr 계정과 Google Tasks 권한을 확인해 주세요.');
    }

    const existingTask = findExistingGoogleTask_(taskList.id, task.id);
    if (existingTask) {
      return jsonResponse({
        ok: true,
        duplicate: true,
        googleTaskId: existingTask.id,
        webViewLink: existingTask.webViewLink || '',
      });
    }

    const googleTask = fetchTasksApi_(
      '/lists/' + encodeURIComponent(taskList.id) + '/tasks',
      'post',
      buildGoogleTask_(task)
    );

    return jsonResponse({
      ok: true,
      googleTaskId: googleTask.id,
      webViewLink: googleTask.webViewLink || '',
    });
  } catch (error) {
    return jsonResponse({
      ok: false,
      error: String(error && error.message ? error.message : error),
    });
  }
}

function getOrCreateFacilityTaskList_() {
  const properties = PropertiesService.getScriptProperties();
  const savedTaskListId = properties.getProperty(TASKLIST_ID_PROPERTY);

  if (savedTaskListId) {
    try {
      return getTaskListById_(savedTaskListId);
    } catch (error) {
      properties.deleteProperty(TASKLIST_ID_PROPERTY);
    }
  }

  let pageToken = '';
  do {
    const result = fetchTasksApi_('/users/@me/lists', 'get', null, {
      maxResults: 100,
      pageToken: pageToken || undefined,
    });
    const taskLists = result.items || [];

    for (let i = 0; i < taskLists.length; i += 1) {
      if (taskLists[i].title === FACILITY_SHARED_TASKLIST_TITLE) {
        properties.setProperty(TASKLIST_ID_PROPERTY, taskLists[i].id);
        return taskLists[i];
      }
    }

    pageToken = result.nextPageToken || '';
  } while (pageToken);

  const createdTaskList = fetchTasksApi_('/users/@me/lists', 'post', {
    title: FACILITY_SHARED_TASKLIST_TITLE,
  });
  properties.setProperty(TASKLIST_ID_PROPERTY, createdTaskList.id);
  return createdTaskList;
}

function getTaskListById_(taskListId) {
  return fetchTasksApi_('/users/@me/lists/' + encodeURIComponent(taskListId), 'get');
}

function getExecutionAccount_() {
  try {
    return Session.getEffectiveUser().getEmail() || '';
  } catch (error) {
    return '';
  }
}

function validateSecret_(incomingSecret) {
  const savedSecret = PropertiesService.getScriptProperties().getProperty('WEBHOOK_SECRET') || '';
  if (savedSecret && incomingSecret !== savedSecret) {
    throw new Error('연동 키가 일치하지 않습니다.');
  }
}

function findExistingGoogleTask_(taskListId, taskId) {
  const marker = getTaskMarker_(taskId);
  let pageToken = '';

  do {
    const result = fetchTasksApi_('/lists/' + encodeURIComponent(taskListId) + '/tasks', 'get', null, {
      maxResults: 100,
      showCompleted: true,
      showDeleted: false,
      showHidden: true,
      pageToken: pageToken || undefined,
    });
    const tasks = result.items || [];

    for (let i = 0; i < tasks.length; i += 1) {
      if ((tasks[i].notes || '').indexOf(marker) !== -1) {
        return tasks[i];
      }
    }

    pageToken = result.nextPageToken || '';
  } while (pageToken);

  return null;
}

function fetchTasksApi_(path, method, payload, query) {
  const url = TASKS_API_BASE_URL + path + buildQuery_(query || {});
  const options = {
    method: method,
    headers: {
      Authorization: 'Bearer ' + ScriptApp.getOAuthToken(),
    },
    muteHttpExceptions: true,
  };

  if (payload) {
    options.contentType = 'application/json';
    options.payload = JSON.stringify(payload);
  }

  const response = UrlFetchApp.fetch(url, options);
  const statusCode = response.getResponseCode();
  const responseText = response.getContentText();

  if (statusCode < 200 || statusCode >= 300) {
    throw new Error('Google Tasks API 오류(' + statusCode + '): ' + responseText);
  }

  return responseText ? JSON.parse(responseText) : {};
}

function buildQuery_(query) {
  const parts = [];
  Object.keys(query).forEach(function(key) {
    const value = query[key];
    if (value === undefined || value === null || value === '') return;
    parts.push(encodeURIComponent(key) + '=' + encodeURIComponent(String(value)));
  });
  return parts.length > 0 ? '?' + parts.join('&') : '';
}

function buildGoogleTask_(task) {
  const googleTask = {
    title: '[시설관리] ' + task.title,
    notes: buildDescription_(task),
    status: task.status === '완료' ? 'completed' : 'needsAction',
  };
  const due = formatGoogleTaskDueDate_(task.dueDate);
  if (due) {
    googleTask.due = due;
  }
  return googleTask;
}

function getTaskMarker_(taskId) {
  return 'DMU_TASK_ID:' + taskId;
}

function buildDescription_(task) {
  const comments = Array.isArray(task.comments) && task.comments.length > 0
    ? '\n\n■ 현장 의견\n' + task.comments.map(function(comment) {
        return '- [' + (comment.senderRole || '') + '] ' + (comment.senderName || '') + ': ' + (comment.content || '');
      }).join('\n')
    : '';

  return [
    '* DMU 시설관리팀 업무 지정',
    '',
    getTaskMarker_(task.id),
    '- 작업 ID: ' + task.id,
    '- 업무구분: ' + (task.category || ''),
    '- 위치: ' + (task.location || ''),
    '- 담당자: ' + (task.assignee || ''),
    '- 우선순위: ' + (task.priority || ''),
    '- 상태: ' + (task.status || ''),
    '- 등록일: ' + formatDate_(task.createdAt),
    '- 완료 예정일시: ' + formatDate_(task.dueDate),
    '',
    '■ 업무 내용',
    task.description || '',
    task.completionReport ? '\n■ 완료 보고\n' + task.completionReport : '',
    task.completionRemarks ? '\n■ 비고\n' + task.completionRemarks : '',
    comments,
  ].join('\n');
}

function formatDate_(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return Utilities.formatDate(date, TIME_ZONE, 'yyyy-MM-dd HH:mm');
}

function formatGoogleTaskDueDate_(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return Utilities.formatDate(date, TIME_ZONE, "yyyy-MM-dd'T'00:00:00.000'Z'");
}

function jsonResponse(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
