// Publishes a community mod from an approved GitHub issue.
const fs = require('fs')
module.exports = async function ({ github, context, core }) {
  const issue = context.payload.issue
  const repo = context.repo
  const say = (body) => github.rest.issues.createComment({ ...repo, issue_number: issue.number, body })
  const close = () => github.rest.issues.update({ ...repo, issue_number: issue.number, state: 'closed' })
  const fail = async (msg) => { await say('Could not publish: ' + msg); await close(); core.setOutput('ok', '0') }

  const m = /```(?:js|javascript)?[ \t]*\r?\n([\s\S]*?)```/.exec(issue.body || '')
  if (!m) return fail('no code block found. Paste the mod code inside a ``` block.')
  const code = m[1].trim()
  if (code.length > 40000) return fail('the mod is too big (40,000 characters max).')
  if (!/BSSMod\s*\.\s*register\s*\(/.test(code)) return fail('the code must call BSSMod.register({...}).')
  const grab = (k) => {
    const r = new RegExp('\\b' + k + '\\s*:\\s*([\'"])((?:\\\\.|(?!\\1)[^\\\\\\n])*)\\1').exec(code)
    return r ? r[2] : ''
  }
  const id = grab('id').replace(/[^a-z0-9-]/gi, '').toLowerCase()
  const name = grab('name') || id
  if (!id) return fail('the mod needs an id: \'something\'.')

  fs.mkdirSync('mods', { recursive: true })
  let list = []
  try { list = JSON.parse(fs.readFileSync('mods/index.json', 'utf8')) } catch (e) {}
  if (list.some((x) => x.id === id)) return fail('a mod with the id "' + id + '" already exists. Pick another id.')

  const file = 'mods/mod-' + issue.number + '.js'
  fs.writeFileSync(file, code + '\n')
  list.push({
    id, name,
    author: grab('author') || issue.user.login,
    desc: grab('desc'),
    url: 'https://cdn.jsdelivr.net/gh/' + repo.owner + '/' + repo.repo + '@main/' + file
  })
  fs.writeFileSync('mods/index.json', JSON.stringify(list, null, 1) + '\n')
  fs.writeFileSync('community.js', 'BSSCommunity(' + JSON.stringify(list).split('\u2028').join('').split('\u2029').join('') + ');\n')
  core.setOutput('ok', '1')
  core.setOutput('name', name)
}
