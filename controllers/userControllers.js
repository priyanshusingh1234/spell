const bcrypt = require('bcryptjs');
const HttpError = require('../models/errorModel');
const User = require('../models/userModel');
const jwt = require("jsonwebtoken");
const { v4: uuid } = require("uuid");

const fs = require("fs");
const path = require("path");

// Register User
const registerUser = async (req, res, next) => {
    try {
        const { name, email, password, password2 } = req.body;

        // Validate required fields
        if (!name || !email || !password || !password2) {
            return next(new HttpError('Fill in all fields.', 422));
        }

        const newEmail = email.toLowerCase();

        // Check if the email is already registered
        const emailExists = await User.findOne({ email: newEmail });
        if (emailExists) {
            return next(new HttpError('User already exists.', 422));
        }

        // Validate password length
        if (password.trim().length < 6) {
            return next(new HttpError('Password must be at least 6 characters long.', 422));
        }

        // Validate password match
        if (password !== password2) {
            return next(new HttpError('Passwords do not match.', 422));
        }

        // Hash the password
        const salt = await bcrypt.genSalt(10);
        const hashedPass = await bcrypt.hash(password, salt);

        // Create the new user
        const newUser = await User.create({
            name,
            email: newEmail,
            password: hashedPass
        });

        res.status(201).json({ message: `New user ${newUser.email} registered` });
    } catch (error) {
        console.error('Registration Error:', error.message);  // Log the error for debugging
        return next(new HttpError('User registration failed', 500)); // Use 500 for server errors
    }
};

// Login User
const loginUser = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        // Validate fields
        if (!email || !password) {
            return next(new HttpError("Fill in all fields.", 422));
        }

        const newEmail = email.toLowerCase();

        // Check if user exists
        const user = await User.findOne({ email: newEmail });
        if (!user) {
            return next(new HttpError("Invalid email or password.", 422));
        }

        // Compare passwords
        const comparePass = await bcrypt.compare(password, user.password);
        if (!comparePass) {
            return next(new HttpError("Invalid email or password.", 422));
        }

        // Generate JWT token
        const { _id: id, name } = user;
        const token = jwt.sign({ id, name }, process.env.JWT_SECRET || 'fallbackSecret', { expiresIn: "1d" });

        res.status(200).json({ token, id, name });
    } catch (error) {
        console.error('Login Error:', error.message);  // Log the error for debugging
        return next(new HttpError("Login failed. Please check your details.", 500)); // Use 500 for server errors
    }
};

// Get User Profile
const getUser = async (req, res, next) => {
    try {
        const { id } = req.params;
        const user = await User.findById(id).select('-password');
        if (!user) {
            return next(new HttpError("User not found", 404));
        }

        res.status(200).json(user);
    } catch (error) {
        return next(new HttpError(error));
    }
};

// Change User Avatar
const changeAvatar = async (req, res, next) => {
    try {
        // Check if any files were uploaded
        if (!req.files || !req.files.avatar) {
            return next(new HttpError("Please choose an image.", 422));
        }

        const { avatar } = req.files;

        // Validate file size (assuming 500kb is 500000 bytes)
        if (avatar.size > 500000) {
            return next(new HttpError("Image must be less than or equal to 500kb.", 422));
        }

        const user = await User.findById(req.user.id);
        if (!user) {
            return next(new HttpError("User not found.", 404));
        }

        // Remove old avatar if exists
        if (user.avatar) {
            fs.unlink(path.join(__dirname, '..', 'uploads', user.avatar), (err) => {
                if (err) {
                    console.error('Error deleting old avatar:', err);
                }
            });
        }

        // Create a unique file name
        const fileExtension = path.extname(avatar.name);
        const newFilename = `${uuid()}${fileExtension}`;

        // Move file to uploads folder
        avatar.mv(path.join(__dirname, '..', 'uploads', newFilename), async (err) => {
            if (err) {
                console.error('File move error:', err);
                return next(new HttpError("File upload failed.", 500));
            }

            // Update user's avatar in the database
            const updatedUser = await User.findByIdAndUpdate(
                req.user.id,
                { avatar: newFilename },
                { new: true }
            );

            if (!updatedUser) {
                return next(new HttpError('Avatar could not be updated.', 422));
            }

            res.status(200).json(updatedUser);
        });
    } catch (error) {
        console.error('Error changing avatar:', error);
        return next(new HttpError("Avatar update failed.", 500));
    }
};

// Edit User Details
const editUser = async (req, res, next) => {
  try {
    const {name , email, currentPassword , newPassword , confirmNewPassword } = req.body;
    if(!name || !email || !currentPassword || !newPassword || !confirmNewPassword){
        return next(new HttpError("Fill in all the fields."))
    }

    //user from database\\
    const user = await User.findById(req.user.id);
    
    if(!user){
        return next(new HttpError("User not found.",403))
    }


    // cheaking email
    const emailExists = await User.findOne({email});
    if(emailExists &&(emailExists._id !=req.user.id)){
        return next(new HttpError("Email already registered.",422))
    }

    //comparing password
    const validateUserPassword = await bcrypt.compare(currentPassword, user.password);
    if(!validateUserPassword){
        return next(new HttpError("Invalid current password.",422))
    }
if(newPassword !== confirmNewPassword){
    return next(new HttpError("Passwords don't match(new).",422))
}


//hash new password
const salt = await bcrypt.genSalt(10)
const hash = await bcrypt.hash(newPassword, salt);




//applying changes to database
const newInfo = await User.findByIdAndUpdate(req.user.id, {name , email , password: hash},{new: true})
res.status(200).json(newInfo)

  } catch (error) {
    return next(new HttpError(error))
  }
};

// Get All Users/Authors
const getAuthors = async (req, res, next) => {
    try {
        const authors = await User.find().select('-password');
        res.json(authors);
    } catch (error) {
        return next(new HttpError(error));
    }
};

module.exports = {
    registerUser,
    loginUser,
    getUser,
    getAuthors,
    changeAvatar,
    editUser
};
