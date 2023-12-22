import {
  $update,
  $query,
  Record,
  StableBTreeMap,
  match,
  Result,
  nat32,
  nat64,
  ic,
  Vec
} from "azle";
import { v4 as uuidv4 } from "uuid";

// Define the User type
type User = Record<{
  id: string;
  username: string;
  password: string;
}>;

// Define the Content type
type Content = Record<{
  id: string;
  userId: string;
  content: string;
  like: nat32;
  dislike: nat32;
  comments: Vec<string>;
  timestamp: nat64;
}>;

// Create a stable B-tree map to store contents and users
const contents = new StableBTreeMap<string, Content>(0, 44, 1024);
const users = new StableBTreeMap<string, User>(1, 44, 1024);

// Keep track of the current user
let currentUser: User | null;

// Utility function to validate UUIDs
function isValidUUID(id: string): boolean {
  // Use your own UUID validation logic here
  return /^[a-f\d]{8}(-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(id);
}

// Update operation to register a new user
$update
export function register(username: string, password: string): Result<User, string> {
  if (!username) {
    return Result.Err("Invalid username");
  }

  if (!password) {
    return Result.Err("Invalid password");
  }
try {
  // Generate a new UUID for the user
  const id = uuidv4();
  
  // Validate generated user ID
  if (!isValidUUID(id)) {
    return Result.Err("Invalid user ID");
  }

  // Create a new user record
  const user: User = {
    id,
    username,
    password,
  };

  // Insert the user into the database
  users.insert(id, user);
  return Result.Ok(user);
} catch (error) {
  // Handle errors during content retrieval
  return Result.Err(`Error while registering: ${error}`);
}
}

// Update operation to sign in a user
$update
export function signin(username: string, password: string): Result<string, string> {
  // Find the user with the specified username
  const user = users.values().filter((u) => u.username === username)[0];

  // Check if the user ID is valid
  if (!user || !isValidUUID(user.id)) {
    return Result.Err("Invalid user ID");
  }

  // Check if the user exists and the password is correct
  if (!user) return Result.Err("Customer doesn't exist...");
  if (user.password !== password) return Result.Err('Password is incorrect...');

  // Set the current user
  currentUser = user;
  return Result.Ok('Successfully Login');
}

// Update operation to sign out the current user
$update
export function signout(): Result<string, string> {
  // Check if a user is currently logged in
  if (!currentUser) return Result.Err("You're not logged in...");

  // Log out the user
  currentUser = null;
  return Result.Ok('Successfully Logout...');
}

// Query operation to get all contents
$query
export function getContents(): Result<Vec<Content>, string> {
  try {
    // Return all contents
    return Result.Ok(contents.values());
  } catch (error) {
    // Handle errors during content retrieval
    return Result.Err(`Error retrieving contents: ${error}`);
  }
}

// Update operation to like a content
$update
export function likeContent(id: string, userId: string): Result<string, string> {
  // Check if the user ID and content ID are valid
  if (!isValidUUID(id) || !isValidUUID(userId)) {
    return Result.Err("Invalid user or content ID");
  }

  return match(users.get(userId), {
    Some: (user) => {

      const contentOpt = contents.get(id);

      return match(contentOpt, {
        Some: (content) => {
          // Increment the like count
          const updatedContent: Content = {
            ...content,
            like: content.like + 1,
          };

          // Update the content in the database
          contents.insert(id, updatedContent);

          return Result.Ok<string, string>('Successfully liked content...');
        },
        None: () => Result.Err<string, string>('Invalid string'),
      });
    },
    None: () => Result.Err<string, string>('You must be logged in...'),
  });
}

// Update operation to dislike a content
$update
export function dislikeContent(id: string, userId: string): Result<string, string> {
  // Check if the user ID and content ID are valid
  if (!isValidUUID(id) || !isValidUUID(userId)) {
    return Result.Err("Invalid user or content ID");
  }

  return match(users.get(userId), {
    Some: (user) => {
      const contentOpt = contents.get(id);

      return match(contentOpt, {
        Some: (content) => {
          // Increment the dislike count
          const updatedContent: Content = {
            ...content,
            dislike: content.dislike + 1,
          };

          // Update the content in the database
          contents.insert(id, updatedContent);

          return Result.Ok<string, string>('Successfully disliked content...');
        },
        None: () => Result.Err<string, string>('Invalid string'),
      });
    },
    None: () => Result.Err<string, string>('You must be logged in...'),
  });
}

// Update operation to post new content
$update
export function postContent(contentText: string, uId: string): Result<Content, string> {
  // Check if the user ID is valid
  if (!isValidUUID(uId)) {
    return Result.Err<Content, string>("Invalid user ID");
  }

  if (!contentText) {
    return Result.Err<Content, string>("Invalid parameter");
  }

  return match(users.get(uId), {
    Some: (user) => {

      // Generate a new UUID for the content
      const id = uuidv4();

      // Validate generated content ID
      if (!isValidUUID(id)) {
        return Result.Err<Content, string>("Invalid content ID");
      }

      // Create a new content record
      const newContent: Content = {
        id,
        userId: user.id,
        content: contentText,
        like: 0,
        dislike: 0,
        comments: [],
        timestamp: ic.time(),
      };

      // Insert the content into the database
      contents.insert(id, newContent);

      return Result.Ok<Content, string>(newContent);
    },
    None: () => Result.Err<Content, string>('You must be logged in...'),
  });
}

// Update operation to post a comment on a content
$update
export function postComment(contentId: string, comment: string, userId: string): Result<Content, string> {
  // Check if the user ID and content ID are valid
  if (!isValidUUID(contentId) || !isValidUUID(userId)) {
    return Result.Err("Invalid user or content ID");
  }

  if (!comment) {
    return Result.Err<Content, string>("Invalid parameter");
  }

  return match(users.get(userId), {
    Some: (user) => {

      const contentOpt = contents.get(contentId);

      return match(contentOpt, {
        Some: (content) => {
          // Add the comment to the content
          const updatedContent: Content = {
            ...content,
            comments: [...content.comments, comment],
          };

          // Update the content in the database
          contents.insert(contentId, updatedContent);

          return Result.Ok<Content, string>(updatedContent);
        },
        None: () => Result.Err<Content, string>('Invalid string'),
      });
    },
    None: () => Result.Err<Content, string>('You must be logged in...'),
  });
}

// Crypto module for generating random values
globalThis.crypto = {
  // @ts-ignore
  getRandomValues: () => {
    let array = new Uint8Array(32);
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
    return array;
  },
};
