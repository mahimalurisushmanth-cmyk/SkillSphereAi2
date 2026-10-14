import assert from 'assert';

const BASE_URL = 'http://127.0.0.1:3000';

async function req(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, ok: res.ok, data };
}

async function runTest() {
  console.log('--- Starting 10-Step Mentorship Workflow Verification ---');

  // Step 1: Register mentor account
  const mentorEmail = `mentor.test.${Date.now()}@skillsphere.ai`;
  console.log('1. Registering mentor account:', mentorEmail);
  const regMentor = await req('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      email: mentorEmail,
      password: 'MentorPassword123!',
      full_name: 'Dr. Sarah Connor',
      role: 'mentor'
    })
  });
  assert.strictEqual(regMentor.status, 201, 'Mentor registration failed');
  const mentorToken = regMentor.data.access_token;
  const mentorId = regMentor.data.user.id;
  const mentorHeaders = { Authorization: `Bearer ${mentorToken}` };

  // Update profile to ensure it is published
  const updateProf = await req('/api/mentors/profile/me', {
    method: 'PUT',
    headers: mentorHeaders,
    body: JSON.stringify({
      title: 'Principal Deep Learning Specialist',
      bio: 'Expert in deep neural architectures, PyTorch pipelines, and LLM fine-tuning.',
      skills: 'PyTorch, CUDA, Transformers, MLOps',
      expertise_domain: 'Deep Learning',
      years_of_experience: 8,
      languages: 'English',
      meeting_preference: 'online',
      available_days: 'Mon, Wed',
      available_times: '19:00 - 21:00 UTC',
      is_published: true
    })
  });
  assert.strictEqual(updateProf.status, 200, 'Mentor profile update failed');
  assert.strictEqual(updateProf.data.is_published, true);

  // Step 2: Register student account
  const studentEmail = `student.test.${Date.now()}@skillsphere.ai`;
  console.log('2. Registering student account:', studentEmail);
  const regStudent = await req('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      email: studentEmail,
      password: 'StudentPassword123!',
      full_name: 'Alex Rivera',
      role: 'student'
    })
  });
  assert.strictEqual(regStudent.status, 201, 'Student registration failed');
  const studentToken = regStudent.data.access_token;
  const studentId = regStudent.data.user.id;
  const studentHeaders = { Authorization: `Bearer ${studentToken}` };

  // Step 3: Log in as student and find mentor
  console.log('3. Searching directory for published mentor');
  const searchRes = await req('/api/mentors?q=Sarah');
  assert.strictEqual(searchRes.status, 200);
  const found = searchRes.data.some((m) => m.user_id === mentorId);
  assert.ok(found, 'Mentor not found in directory search');

  // Step 4: Submit mentorship request
  console.log('4. Student submitting mentorship request');
  const requestRes = await req('/api/mentorship-requests', {
    method: 'POST',
    headers: studentHeaders,
    body: JSON.stringify({
      mentor_id: mentorId,
      learning_goals: 'Master PyTorch architectures and review portfolio',
      message: 'Hi Dr. Connor, I would love your feedback on my models.',
      preferred_times: 'Wednesdays at 19:00 UTC'
    })
  });
  assert.strictEqual(requestRes.status, 201, 'Mentorship request creation failed');
  const requestId = requestRes.data.id;
  assert.strictEqual(requestRes.data.status, 'pending');

  // Step 5: Log in as mentor and accept request
  console.log('5. Mentor viewing incoming request and accepting');
  const mentorReqs = await req('/api/mentorship-requests', { headers: mentorHeaders });
  assert.strictEqual(mentorReqs.status, 200);
  const matching = mentorReqs.data.find((r) => r.id === requestId);
  assert.ok(matching, 'Request not found in mentor incoming list');

  const acceptRes = await req(`/api/mentorship-requests/${requestId}`, {
    method: 'PATCH',
    headers: mentorHeaders,
    body: JSON.stringify({
      status: 'accepted',
      mentor_response: 'Delighted to help you Alex! Let us kick off this Wednesday.'
    })
  });
  assert.strictEqual(acceptRes.status, 200);
  assert.strictEqual(acceptRes.data.status, 'accepted');

  // Step 6: Log in as student and confirm updated status
  console.log('6. Student checking updated status and conversation');
  const studentReqCheck = await req(`/api/mentorship-requests/${requestId}`, { headers: studentHeaders });
  assert.strictEqual(studentReqCheck.status, 200);
  assert.strictEqual(studentReqCheck.data.status, 'accepted');
  const conversationId = studentReqCheck.data.conversation_id;
  assert.ok(conversationId, 'Conversation was not created on acceptance');

  // Step 7: Send messages from each account and verify persistence
  console.log('7. Exchanging messages between student and mentor');
  const msg1 = await req(`/api/conversations/${conversationId}/messages`, {
    method: 'POST',
    headers: studentHeaders,
    body: JSON.stringify({ content: 'Thank you for accepting! What should I prepare for our kickoff?' })
  });
  assert.strictEqual(msg1.status, 201);

  const msg2 = await req(`/api/conversations/${conversationId}/messages`, {
    method: 'POST',
    headers: mentorHeaders,
    body: JSON.stringify({ content: 'Please push your latest PyTorch repository and write down 3 key questions.' })
  });
  assert.strictEqual(msg2.status, 201);

  const fetchMsgs = await req(`/api/conversations/${conversationId}/messages`, { headers: studentHeaders });
  assert.strictEqual(fetchMsgs.status, 200);
  assert.strictEqual(fetchMsgs.data.length, 2);
  assert.strictEqual(fetchMsgs.data[0].content, msg1.data.content);
  assert.strictEqual(fetchMsgs.data[1].content, msg2.data.content);

  // Step 8: Schedule session and confirm on both dashboards
  console.log('8. Scheduling session and verifying on both accounts');
  const sessionRes = await req('/api/sessions', {
    method: 'POST',
    headers: studentHeaders,
    body: JSON.stringify({
      student_id: studentId,
      mentor_id: mentorId,
      title: 'Sprint 1: Model Architecture & Data Pipeline Review',
      scheduled_at: new Date(Date.now() + 86400000 * 2).toISOString(),
      duration_minutes: 45,
      meeting_method: 'online',
      meeting_link_or_location: 'https://meet.google.com/xyz-skillsphere-session',
      notes: 'Review PyTorch loss divergence issue'
    })
  });
  assert.strictEqual(sessionRes.status, 201, 'Session scheduling failed');
  const sessionId = sessionRes.data.id;

  const studentSessions = await req('/api/sessions', { headers: studentHeaders });
  assert.ok(studentSessions.data.some((s) => s.id === sessionId));

  const mentorSessions = await req('/api/sessions', { headers: mentorHeaders });
  assert.ok(mentorSessions.data.some((s) => s.id === sessionId));

  // Step 9: Verify persistence in database file
  console.log('9. Checking database persistence on disk');
  const fs = await import('fs');
  const dbData = JSON.parse(fs.readFileSync('skillsphere-db.json', 'utf-8'));
  assert.ok(dbData.users.some((u) => u.id === mentorId));
  assert.ok(dbData.users.some((u) => u.id === studentId));
  assert.ok(dbData.requests.some((r) => r.id === requestId && r.status === 'accepted'));
  assert.ok(dbData.messages.some((m) => m.conversation_id === conversationId));
  assert.ok(dbData.sessions.some((s) => s.id === sessionId));

  // Step 10: Security and permissions boundary checks
  console.log('10. Verifying authorization boundaries for unauthorized users');
  const intruderRes = await req('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      email: `intruder.${Date.now()}@skillsphere.ai`,
      password: 'IntruderPassword123!',
      full_name: 'Intruder',
      role: 'student'
    })
  });
  const intruderHeaders = { Authorization: `Bearer ${intruderRes.data.access_token}` };

  // Intruder cannot view private messages
  const unauthorizedMsgs = await req(`/api/conversations/${conversationId}/messages`, { headers: intruderHeaders });
  assert.strictEqual(unauthorizedMsgs.status, 403, 'Intruder was able to view private messages');

  // Intruder cannot post to private conversation
  const unauthorizedPost = await req(`/api/conversations/${conversationId}/messages`, {
    method: 'POST',
    headers: intruderHeaders,
    body: JSON.stringify({ content: 'Malicious payload' })
  });
  assert.strictEqual(unauthorizedPost.status, 403, 'Intruder was able to send message');

  // Intruder cannot modify other user request
  const unauthorizedMod = await req(`/api/mentorship-requests/${requestId}`, {
    method: 'PATCH',
    headers: intruderHeaders,
    body: JSON.stringify({ status: 'rejected' })
  });
  assert.strictEqual(unauthorizedMod.status, 403, 'Intruder was able to alter request');

  console.log('✅ ALL 10 STEPS PASSED SUCCESSFULLY!');
}

runTest().catch((err) => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
