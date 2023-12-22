import {
  Canister,
  query,
  text,
  update,
  Record,
  Principal,
  Result,
  StableBTreeMap,
  Vec,
  ic,
  nat64,
  Err,
  Ok,
  nat32,
} from 'azle';

const User = Record({
  id: Principal,
  username: text,
  password: text,
});

const Content = Record({
  id: Principal,
  userId: Principal,
  content: text,
  like: nat32,
  dislike: nat32,
  comments: Vec(text),
  timestamp: nat64,
});

const contents = StableBTreeMap<Principal, typeof Content.tsType>(0);
const users = StableBTreeMap<Principal, typeof User.tsType>(1);

let currentUser: typeof User.tsType | null;

export default Canister({
  register: update([text, text], Result(text, text), (username, password) => {
    const id = generateId();
    const user: typeof User.tsType = {
      id,
      username: username,
      password: password,
    };
    users.insert(id, user);
    return Ok('Successfully registered...');
  }),

  signin: update([text, text], Result(text, text), (username, password) => {
    const user = users.values().filter((u) => u.username === username)[0];

    if (!user) return Err("Customer doesn't exist...");
    if (user.password !== password) return Err('Password is incorrect...');

    currentUser = user;
    return Ok('Successfully Login');
  }),

  signout: update([], Result(text, text), () => {
    if (!currentUser) return Err("You're not logged in...");
    currentUser = null;
    return Ok('Successfully Logout...');
  }),

  getContents: query([], Vec(Content), () => {
    return contents.values();
  }),

  likeContent: update([Principal], Result(text, text), (id) => {
    if (!currentUser) return Err('You must be logged in...');

    const contentOpt = contents.get(id);

    if ('None' in contentOpt) return Err('Invalid Principal');

    const content = contentOpt.Some;

    const updatedContent: typeof Content.tsType = {
      ...content,
      like: content.like + 1,
    };

    contents.insert(content.id, updatedContent);

    return Ok('Successfully liked content...');
  }),

  dislikeContent: update([Principal], Result(text, text), (id) => {
    if (!currentUser) return Err('You must be logged in...');

    const contentOpt = contents.get(id);

    if ('None' in contentOpt) return Err('Invalid Principal');

    const content = contentOpt.Some;

    const updatedContent: typeof Content.tsType = {
      ...content,
      dislike: content.dislike + 1,
    };

    contents.insert(content.id, updatedContent);

    return Ok('Successfully disliked content...');
  }),

  postContent: update([text], Result(text, text), (content) => {
    if (!currentUser) return Err('You must be logged in...');

    const id = generateId();
    const newContent: typeof Content.tsType = {
      id,
      userId: currentUser.id,
      content,
      like: 0,
      dislike: 0,
      comments: [],
      timestamp: ic.time(),
    };

    contents.insert(id, newContent);

    return Ok('Successfully post content...');
  }),

  postComment: update([Principal, text], Result(text, text), (id, comment) => {
    if (!currentUser) return Err('You must be logged in...');

    const contentOpt = contents.get(id);

    if ('None' in contentOpt) return Err('Invalid Principal');

    const content = contentOpt.Some;

    const updatedContent: typeof Content.tsType = {
      ...content,
      comments: [...content.comments, comment],
    };

    contents.insert(content.id, updatedContent);

    return Ok('Successfully comment on content...');
  }),
});

function generateId(): Principal {
  const randomBytes = new Array(29)
    .fill(0)
    .map((_) => Math.floor(Math.random() * 256));

  return Principal.fromUint8Array(Uint8Array.from(randomBytes));
}
