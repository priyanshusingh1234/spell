const Post = require("../models/postModel");
const User = require("../models/userModel");
const path = require('path');
const fs = require('fs');
const { v4: uuid } = require('uuid');
const HttpError = require('../models/errorModel');

// Create a new post
const createPost = async (req, res, next) => {
  try {
    let { title, category, description } = req.body;

    if (!title || !category || !description || !req.files) {
      return next(new HttpError("Fill in all the fields and choose a thumbnail.", 422));
    }

    const { thumbnail } = req.files;

    if (thumbnail.size > 2000000) {
      return next(new HttpError("Thumbnail must be less than 2 MB.", 422));
    }

    let fileName = thumbnail.name;
    let splittedFileName = fileName.split('.');
    let newFileName = splittedFileName[0] + uuid() + "." + splittedFileName[splittedFileName.length - 1];

    thumbnail.mv(path.join(__dirname, '..', '/uploads', newFileName), async (err) => {
      if (err) {
        return next(new HttpError(err.message, 500));
      } else {
        const newPost = await Post.create({ title, category, description, thumbnail: newFileName, creator: req.user.id });
        if (!newPost) {
          return next(new HttpError("Post could not be created.", 422));
        }

        const currentUser = await User.findById(req.user.id);
        const userPostCount = currentUser.posts + 1;
        await User.findByIdAndUpdate(req.user.id, { posts: userPostCount });

        res.status(201).json(newPost);
      }
    });
  } catch (error) {
    return next(new HttpError(error.message, 500));
  }
};

// Get all posts
const getPosts = async (req, res, next) => {
  try {
    const posts = await Post.find().sort({ updatedAt: -1 });
    res.status(200).json(posts);
  } catch (error) {
    return next(new HttpError(error.message, 500));
  }
};

// Get a specific post by ID
const getPost = async (req, res, next) => {
  try {
    const postId = req.params.id;
    const post = await Post.findById(postId);
    if (!post) {
      return next(new HttpError("Post not found.", 404));
    }
    res.status(200).json(post);
  } catch (error) {
    return next(new HttpError(error.message, 500));
  }
};

// Get posts by category
const getCatPosts = async (req, res, next) => {
  try {
    const { category } = req.params;
    const catPosts = await Post.find({ category }).sort({ createdAt: -1 });
    res.status(200).json(catPosts);
  } catch (error) {
    return next(new HttpError(error.message, 500));
  }
};

// Get posts by a specific user
const getUserPosts = async (req, res, next) => {
  try {
    const { id } = req.params;
    const posts = await Post.find({ creator: id }).sort({ createdAt: -1 });
    res.status(200).json(posts);
  } catch (error) {
    return next(new HttpError(error.message, 500));
  }
};

// Edit a post
const editPost = async (req, res, next) => {
  try {
    const postId = req.params.id;
    const { title, category, description } = req.body;

    // Validate input fields
    if (!title || !category || description.length < 12) {
      return next(new HttpError("Please fill in all fields with valid data.", 422));
    }

    // Find the existing post
    const oldPost = await Post.findById(postId);

    // Check if the user editing the post is the creator
    if (req.user.id !== oldPost.creator.toString()) {
      return next(new HttpError("You are not authorized to edit this post.", 403));
    }

    let updatedPost;

    if (!req.files) {
      // Update without thumbnail
      updatedPost = await Post.findByIdAndUpdate(postId, { title, category, description }, { new: true });
    } else {
      // Delete old thumbnail
      const oldThumbnailPath = path.join(__dirname, '..', 'uploads', oldPost.thumbnail);
      fs.unlink(oldThumbnailPath, async (err) => {
        if (err) return next(new HttpError("Error deleting the old thumbnail.", 500));
      });

      // Upload new thumbnail
      const { thumbnail } = req.files;
      if (thumbnail.size > 2000000) {
        return next(new HttpError("Thumbnail must be less than 2 MB.", 422));
      }

      let fileName = thumbnail.name;
      let splittedFileName = fileName.split('.');
      let newFileName = splittedFileName[0] + uuid() + "." + splittedFileName[splittedFileName.length - 1];

      thumbnail.mv(path.join(__dirname, '..', 'uploads', newFileName), async (err) => {
        if (err) {
          return next(new HttpError(err.message, 500));
        }
      });

      updatedPost = await Post.findByIdAndUpdate(postId, { title, category, description, thumbnail: newFileName }, { new: true });
    }

    if (!updatedPost) {
      return next(new HttpError("Could not update post.", 400));
    }
    
    res.status(200).json(updatedPost);
  } catch (error) {
    return next(new HttpError(error.message, 500));
  }
};

// Delete a post
const deletePost = async (req, res, next) => {
  try {
    const postId = req.params.id;

    // Find the post by ID
    const post = await Post.findById(postId);
    if (!post) {
      return next(new HttpError("Post not found.", 404));
    }

    // Check if the user deleting the post is the creator
    if (req.user.id !== post.creator.toString()) {
      return next(new HttpError("You are not authorized to delete this post.", 403));
    }

    const thumbnailPath = path.join(__dirname, '..', 'uploads', post.thumbnail);

    // Remove the thumbnail from the server
    fs.unlink(thumbnailPath, async (err) => {
      if (err) return next(new HttpError("Error deleting the thumbnail.", 500));

      // Delete the post from the database
      await Post.findByIdAndDelete(postId);

      // Update the user's post count
      await User.findByIdAndUpdate(req.user.id, { $inc: { posts: -1 } });

      res.status(200).json({ message: `Post ${postId} deleted successfully.` });
    });
  } catch (error) {
    return next(new HttpError(error.message, 500));
  }
};

module.exports = {
  createPost,
  editPost,
  deletePost,
  getCatPosts,
  getPosts,
  getUserPosts,
  getPost,
};
