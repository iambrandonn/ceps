# tests/fixtures/mongoose-basic/src/models

**Directory Overview:** This directory contains 2 entities.

## Post.ts

<a id="us1LahAS89"></a>

### Post

**Visibility:** Public (exported)

**Behavior:**

- Mongoose model Post for collection 'Post' using schema postSchema. Supports fields: title, content, author → User.

## User.ts

<a id="zh0WKWAjvy"></a>

### User

**Visibility:** Public (exported)

**Behavior:**

- Mongoose model User for collection 'User' using schema userSchema. Supports fields: age, name (required), email (required), posts → Post.

