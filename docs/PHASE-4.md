# GitZone Phase 4 - Repository Content & Git Data

## Status

**COMPLETE**

Phase 4 adds secure repository-content reading on top of GitZone's real Git repository infrastructure.

## Git Object Reading

Implemented:

- Repository tree service
- Root directory listing
- Nested directory listing
- Git blob/file reading
- Binary-file detection
- Configurable file-size limits
- Large-object protection
- Safe Git subprocess execution
- Exact blob OID reads
- SHA-1 and SHA-256 object ID support

Git objects are read using controlled Git subprocesses without shell execution.
Repository identity, paths, refs, and object IDs are validated before Git commands are executed.

## Repository Content API

Phase 4 provides repository-content endpoints including:

```text
GET /api/repositories/:username/:name/git/refs
GET /api/repositories/:username/:name/git/branches
GET /api/repositories/:username/:name/git/tree
GET /api/repositories/:username/:name/git/contents
GET /api/repositories/:username/:name/git/raw
GET /api/repositories/:username/:name/git/readme
GET /api/repositories/:username/:name/git/blobs/:sha
GET /api/repositories/:username/:name/git/commits
GET /api/repositories/:username/:name/git/commits/:sha
```

## Tree Browsing

The tree API supports repository root browsing, nested paths, branch/tag selection, default branch resolution, files, directories, symlinks, and Git submodules.

## File Content

Text file responses include path, resolved ref, blob OID, file size, UTF-8 encoding, and content.

Binary files are rejected by text-content endpoints.

## Raw Files

The raw endpoint returns exact Git blob bytes using application/octet-stream and includes X-Git-Blob-Oid and X-Git-Ref response headers.

The configured maximum readable file size is enforced before blob content is loaded.

## README Detection

GitZone detects the following root README names case-insensitively:

- README.md
- README.markdown
- README.mdown
- README.mkdn
- README.rst
- README.txt
- README

README content is read using the exact blob OID returned by the repository tree. This prevents branch movement between tree discovery and content reading from returning a different Git object.

## Security

- Repository authorization before protected reads
- Public/private repository access enforcement
- Safe repository storage boundaries
- Safe Git tree paths
- Safe Git ref validation
- Safe blob SHA validation
- No shell-based Git command execution
- Restricted Git child-process environment
- Git command timeouts
- Git output buffer limits
- File-size limits before blob reads
- Binary-file protection for text endpoints
- Large-object protection
- Invalid revision handling
- Invalid path handling
- Exact-OID README reads

## Verification

Phase 4 was verified with:

- Unit tests
- Integration tests
- Real Git repository E2E testing
- Raw binary integrity verification
- Binary-file rejection testing
- Large-file rejection testing
- Invalid ref/path testing
- README detection E2E
- Postman/Newman E2E
- TypeScript source checks
- TypeScript test checks
- ESLint
- Production build verification

## Postman / Newman

Collection:

```text
server/postman/GitZone-Phase4.postman_collection.json
```

Run:

```powershell
cd server
npx newman run postman\GitZone-Phase4.postman_collection.json
```

Final Phase 4 Newman verification:

- 9 requests
- 9 test scripts
- 28 assertions
- 0 failures

## Phase 4 Checklist

### Git Object Reading

- [x] Repository tree service
- [x] Directory listing
- [x] Blob/file reading
- [x] Binary-file detection
- [x] File-size limits
- [x] Safe Git object access

### Repository API

- [x] Repository root tree endpoint
- [x] Nested tree endpoint
- [x] File content endpoint
- [x] Raw file endpoint
- [x] README detection
- [x] Default branch resolution

### Security & Verification

- [x] Private repository authorization
- [x] Invalid revision handling
- [x] Invalid path handling
- [x] Large-object protection
- [x] Unit tests
- [x] Integration tests
- [x] Postman E2E
- [x] Git object security audit
- [ ] Final full quality gate
- [x] Documentation
- [ ] Commit & push

## Completion

Phase 4 is ready for final quality-gate verification and commit/push.
