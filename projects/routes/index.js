const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const ProjectModel = require("../model/project");
const UserModel = require("../model/user");
const app = require("../app");
var db = require("../model/db");
const bcrypt = require("bcrypt");

router.get("/", async (req, res, next) => {
  if (!req.session.isLoggedIn) {
    return res.redirect("/login");
  }
  res.render("index");
});

router.get("/my-projects", async (req, res) => {
  if (!req.session.isLoggedIn) {
    return res.redirect("/login");
  } else {
    try {
      const userId = req.session.userId;
      const projects = await ProjectModel.find({ manager: userId }).populate(
        "team.userId",
        "name"
      );
      res.render("my-projects", { projects: projects });
    } catch (err) {
      console.error("Error fetching projects:", err);
      res.status(500).send("Error fetching projects");
    }
  }
});

router.get("/part-of-projects", async (req, res) => {
  if (!req.session.isLoggedIn) {
    return res.redirect("/login");
  }

  try {
    const userId = req.session.userId;
    const projects = await ProjectModel.find({
      "team.userId": userId,
      isArchived: "No",
    }).populate("team.userId", "name");

    res.render("part-of-projects", { projects: projects });
  } catch (error) {
    console.error("Error fetching projects:", error);
    res.status(500).send("Internal Server Error");
  }
});

router.get("/register", (req, res) => {
  if (req.session.isLoggedIn) {
    return res.redirect("/");
  }
  res.render("register");
});

router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const existingUser = await UserModel.findOne({ email });

    if (existingUser) {
      return res.status(409).send("User with this email already exists.");
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new UserModel({
      name,
      email,
      password: hashedPassword,
    });

    await user.save();
    console.log("User registered successfully:", user);
    res.redirect("/login");
  } catch (error) {
    console.error("Error registering user:", error);
    res.status(500).send("Internal Server Error");
  }
});

router.get("/login", (req, res) => {
  if (req.session.isLoggedIn) {
    return res.redirect("/");
  }
  res.render("login");
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await UserModel.findOne({ email });

    if (!user) {
      return res.status(404).send("User not found");
    }

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(401).send("Wrong email or password");
    }

    req.session.isLoggedIn = true;
    req.session.userId = user._id;

    console.log("User logged in successfully:", user);
    res.redirect("/");
  } catch (error) {
    console.error("Error logging in:", error);
    res.status(500).send("Internal Server Error");
  }
});

router.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Error destroying session:", err);
      res.status(500).send("Internal Server Error");
    } else {
      res.redirect("/login");
    }
  });
});

router.get("/add-project", (req, res) => {
  if (!req.session.isLoggedIn) {
    return res.redirect("/login");
  }
  res.render("add-project");
});

router.post("/add-project", async (req, res) => {
  try {
    const {
      name,
      description,
      price,
      completed_jobs,
      start_date,
      end_date,
      isArchived,
    } = req.body;

    const managerId = req.session.userId;

    const project = new ProjectModel({
      name,
      description,
      price,
      completed_jobs,
      start_date,
      end_date,
      isArchived,
      manager: managerId,
    });

    await project.save();

    console.log("Document saved to database...");
    res.redirect("/my-projects");
  } catch (error) {
    console.error("Error saving document...", error);
    res.status(500).send("Internal Server Error");
  }
});


router.get("/edit-project/:projectId", async (req, res) => {
  if (!req.session.isLoggedIn) {
    return res.redirect("/login");
  } else {
    try {
      const projectId = req.params.projectId;
      const project = await ProjectModel.findById(projectId);
      var start_date = project.start_date.toISOString();
      start_date = start_date.substring(0, start_date.indexOf("T"));
      var end_date = project.end_date.toISOString();
      end_date = end_date.substring(0, end_date.indexOf("T"));

      if (!project) {
        return res.status(404).send("Project not found");
      }
      res.render("edit-project", {
        start_date: start_date,
        end_date: end_date,
        project: project,
      });
    } catch (error) {
      console.error("Error fetching project for edit:", error);
      res.status(500).send("Internal Server Error");
    }
  }
});

router.post("/edit-project/:projectId", async (req, res) => {
  try {
    const projectId = req.params.projectId;
    const {
      name,
      description,
      price,
      completed_jobs,
      start_date,
      end_date,
      isArchived,
    } = req.body;

    await ProjectModel.findByIdAndUpdate(projectId, {
      name,
      description,
      price,
      completed_jobs,
      start_date,
      end_date,
      isArchived,
    });

    res.redirect("/my-projects");
  } catch (error) {
    console.error("Error updating project:", error);
    res.status(500).send("Internal Server Error");
  }
});


router.get("/edit-project-user/:projectId", async (req, res) => {
  if (!req.session.isLoggedIn) {
    return res.redirect("/login");
  }

  try {
    const projectId = req.params.projectId;
    const project = await ProjectModel.findById(projectId);
    var start_date = project.start_date.toISOString();
    start_date = start_date.substring(0, start_date.indexOf("T"));
    var end_date = project.end_date.toISOString();
    end_date = end_date.substring(0, end_date.indexOf("T"));

    if (!project) {
      return res.status(404).send("Project not found");
    }
    res.render("edit-project-user", {
      start_date: start_date,
      end_date: end_date,
      project: project,
    });
  } catch (error) {
    console.error("Error fetching project:", error);
    res.status(500).send("Internal Server Error");
  }
});

router.post("/edit-project-user/:projectId", async (req, res) => {
  try {
    const projectId = req.params.projectId;
    const { completed_jobs } = req.body;

    await ProjectModel.findByIdAndUpdate(projectId, {
      completed_jobs,
    });

    res.redirect("/part-of-projects");
  } catch (error) {
    console.error("Error updating project:", error);
    res.status(500).send("Internal Server Error");
  }
});


router.get("/archive", async (req, res) => {
  if (!req.session.isLoggedIn) {
    return res.redirect("/login");
  }

  try {
    const userId = req.session.userId;
    const archivedProjects = await ProjectModel.find({
      $or: [
        { manager: userId, isArchived: "Yes" },
        { "team.userId": userId, isArchived: "Yes" },
      ],
    }).populate("team.userId", "name");

    res.render("archive", { projects: archivedProjects });
  } catch (error) {
    console.error("Error fetching archived projects:", error);
    res.status(500).send("Internal Server Error");
  }
});


router.post("/delete-project/:projectId", async (req, res) => {
  try {
    const projectId = req.params.projectId;

    await ProjectModel.findByIdAndDelete(projectId);

    res.redirect("/my-projects");
  } catch (error) {
    console.error("Error deleting project:", error);
    res.status(500).send("Internal Server Error");
  }
});

router.get("/add-team-member/:projectId", async (req, res) => {
  if (!req.session.isLoggedIn) {
    return res.redirect("/login");
  }

  try {
    const projectId = req.params.projectId;
    const project = await ProjectModel.findById(projectId);

    if (!project) {
      return res.status(404).send("Project not found");
    }

    const users = await UserModel.find();

    const projectMembers = project.team.map((member) => member.userId.toString());

    res.render("add-team-member", {
      users: users,
      projectId: projectId,
      projectMembers: projectMembers,
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).send("Internal Server Error");
  }
});


router.post("/add-team-member/:projectId", async (req, res) => {
  if (!req.session.isLoggedIn) {
    return res.redirect("/login");
  }

  try {
    const projectId = req.params.projectId;
    const project = await ProjectModel.findById(projectId);

    if (!project) {
      return res.status(404).send("Project not found");
    }

    const teamMembers = Object.keys(req.body)
      .filter((key) => key.startsWith("teamMember_"))
      .map((key) => req.body[key]);

    const selectedUsers = await UserModel.find({ _id: { $in: teamMembers } });

    project.team = selectedUsers.map((user) => ({
      userId: user._id,
      userName: user.name,    
    }));

    await project.save();

    res.redirect("/my-projects");
  } catch (error) {
    console.error("Error adding team members:", error);
    res.status(500).send("Internal Server Error");
  }
});

module.exports = router;
