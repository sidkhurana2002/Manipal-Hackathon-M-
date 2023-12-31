const Challenge = require("../models/Challenge");
const User = require("../models/User");
const Journey = require("../models/Journey");

const Trip = require("../models/Trip");
const distanceController = require("./distanceController");
const geolib = require("geolib");

const addChallenge = async (req, res) => {
  try {
    const {
      title,
      tag, //walking, cycling, public transport, carpooling, exservicemen
      description,
      challenge_points,
      challenge_distance,
      transportType,
      challengeImage,
      challengeAgeLimit,
      lastDateToComplete,
    } = req.body;

    const newChallenge = new Challenge({
      title,
      tag,
      description,
      challenge_points,
      challenge_distance,
      transportType,
      challengeImage,
      challengeAgeLimit,
      lastDateToComplete,
      users: [],
    });

    await newChallenge.save();

    res.status(201).json({
      message: "Challenge added successfully",
      challenge: newChallenge,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};
// vision impairment,legs impairment, hand impairment,
// vision impairment- walking, public transport, carpooling
// legs impairment- public transport, carpooling
// hand impairment- public transport, carpooling, walking
// exServicemen- exServicemen

// const getChallenges = async (req, res) => {
//   try {
//     const { userId } = req.body;

//     // Find the user by userId
//     const user = await User.findById(userId);

//     if (!user) {
//       return res.status(404).json({ message: "User not found" });
//     }

//     // Calculate user's age based on the user's birthdate or any other relevant attribute
//     const userAge = user.profile.age;

//     // Find challenges with age limit within the user's age
//     const challenges = await Challenge.find({
//       $or: [
//         { challengeAgeLimit: { $exists: false } }, // Challenges without age limits
//         {
//           $and: [
//             { "challengeAgeLimit.min": { $lte: userAge } },
//             { "challengeAgeLimit.max": { $gte: userAge } },
//           ],
//         },
//       ],
//     });

//     res.status(200).json({ challenges });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: "Internal server error" });
//   }
// };

const getChallenges = async (req, res) => {
  try {
    const { userId } = req.body;

    // Find the user by userId
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Get user profile details
    const {
      isDisabled,
      isdisabledverify,
      disabilityName,
      isExServiceman,
      isServicemanVerify,
    } = user.profile;

    // Filter challenges based on user's disability and ex-servicemen status
    let challengeFilter = {};

    if (isDisabled && isdisabledverify && disabilityName) {
      // Challenges for users with disabilities
      switch (disabilityName.toLowerCase()) {
        case "vision impairment":
          challengeFilter = {
            tag: { $in: ["walking", "public transport", "carpooling"] },
          };
          break;
        case "legs impairment":
          challengeFilter = {
            tag: { $in: ["public transport", "carpooling"] },
          };
          break;
        case "hand impairment":
          challengeFilter = {
            tag: { $in: ["public transport", "carpooling", "walking"] },
          };
          break;
        default:
          // Handle other disability types if needed
          break;
      }
    } else if (isExServiceman && isServicemanVerify) {
      // Challenges for ex-servicemen
      challengeFilter = { tag: "exServicemen" };
    } else {
      // Challenges for users who are neither disabled nor ex-servicemen
      challengeFilter = { tag: { $ne: "exServicemen" } };
    }

    // Find challenges based on age and additional filters
    const challenges = await Challenge.find({
      $and: [
        {
          $or: [
            { challengeAgeLimit: { $exists: false } },
            {
              $and: [
                { "challengeAgeLimit.min": { $lte: user.profile.age } },
                { "challengeAgeLimit.max": { $gte: user.profile.age } },
              ],
            },
          ],
        },
        challengeFilter, // Additional challenge filters
      ],
    });

    res.status(200).json({ challenges });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = { getChallenges };

// const addTrip = async (req, res) => {
//   try {
//     const { userId, start, end, challengeId } = req.body;

//     const user = await User.findById(userId);

//     if (!user) {
//       return res.status(404).json({ message: "User not found" });
//     }

//     const distance = geolib.getDistance(
//       { latitude: start.latitude, longitude: start.longitude },
//       { latitude: end.latitude, longitude: end.longitude }
//     );

//     const distanceInKm = distance / 1000;

//     const emissionFactor = 0.142;
//     const emissionGrams = distanceInKm * emissionFactor;

//     user.profile.totalCarbonEmission += emissionGrams;

//     const currentDate = new Date();
//     const newTrip = new Trip({
//       userId,
//       date: currentDate,
//       startLatitude: start.latitude,
//       startLongitude: start.longitude,
//       endLatitude: end.latitude,
//       endLongitude: end.longitude,
//       distance: distanceInKm,
//     });

//     if (challengeId) {
//       const challenge = await Challenge.findById(challengeId);

//       if (!challenge) {
//         return res.status(404).json({ message: "Challenge not found" });
//       }

//       const isChallengeCompleted = user.challenges.some(
//         (ch) => ch.challengeId.toString() === challengeId
//       );

//       if (
//         !isChallengeCompleted &&
//         distanceInKm >= challenge.challenge_distance
//       ) {
//         const challengePoints = challenge.challenge_points;
//         user.profile.progress.totalPoints += challengePoints;
//         user.rewards.points += challengePoints;

//         const totalPoints = user.profile.progress.totalPoints;
//         if (totalPoints >= 0 && totalPoints <= 1000) {
//           user.profile.progress.experience = "Seed Sower";
//         } else if (totalPoints <= 3000) {
//           user.profile.progress.experience = "Recycle Rookie";
//         } else if (totalPoints <= 6000) {
//           user.profile.progress.experience = "Ocean Guardian";
//         } else if (totalPoints <= 10000) {
//           user.profile.progress.experience = "Sustainable Sorcerer";
//         } else {
//           user.profile.progress.experience = "Eco Champion";
//         }

//         user.challenges.push({ challengeId });
//         await user.save();

//         challenge.users.push({
//           userId: user._id,
//           completed: true,
//           completionDate: new Date(),
//         });
//         await challenge.save();

//         newTrip.challengeId = challengeId;
//       }
//     }

//     await newTrip.save();

//     user.trips.push({ tripId: newTrip._id });
//     await user.save();

//     res.status(201).json({
//       message: "Trip added successfully",
//       trip: newTrip,
//       distance: distanceInKm,
//       emission_grams: emissionGrams,
//     });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: "Internal server error" });
//   }
// };
const addTrip = async (req, res) => {
  try {
    const { userId, start, end, challengeId } = req.body;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const distance = geolib.getDistance(
      { latitude: start.latitude, longitude: start.longitude },
      { latitude: end.latitude, longitude: end.longitude }
    );

    const distanceInKm = distance / 1000;

    const emissionFactor = 0.142;
    const emissionGrams = distanceInKm * emissionFactor;

    user.profile.totalCarbonEmission += emissionGrams;

    const currentDate = new Date();
    const newTrip = new Trip({
      userId,
      date: currentDate,
      startLatitude: start.latitude,
      startLongitude: start.longitude,
      endLatitude: end.latitude,
      endLongitude: end.longitude,
      distance: distanceInKm,
    });

    if (challengeId) {
      const challenge = await Challenge.findById(challengeId);

      if (!challenge) {
        return res.status(404).json({ message: "Challenge not found" });
      }

      const isChallengeCompleted = user.challenges.some(
        (ch) => ch.challengeId.toString() === challengeId
      );

      if (
        challengeId &&
        !isChallengeCompleted &&
        distanceInKm >= challenge.challenge_distance
      ) {
        user.profile.progress.totalPoints += challenge.challenge_points;
        user.rewards.points += challenge.challenge_points;

        const totalPoints = user.profile.progress.totalPoints;
        if (totalPoints >= 0 && totalPoints <= 1000) {
          user.profile.progress.experience = "Seed Sower";
        } else if (totalPoints <= 3000) {
          user.profile.progress.experience = "Recycle Rookie";
        } else if (totalPoints <= 6000) {
          user.profile.progress.experience = "Ocean Guardian";
        } else if (totalPoints <= 10000) {
          user.profile.progress.experience = "Sustainable Sorcerer";
        } else {
          user.profile.progress.experience = "Eco Champion";
        }

        // Check if the user is the first to complete the challenge
        const isFirstToComplete = challenge.users.length === 0;

        // Push the user into the challenge schema
        challenge.users.push({
          userId: user._id,
          completed: true,
          completionDate: new Date(),
        });

        // If the user is the first to complete, update the challengeId in the trip
        if (isFirstToComplete) {
          newTrip.challengeId = challengeId;
        }

        // Save the challenge
        await challenge.save();
      }
    }

    await newTrip.save();

    user.trips.push({ tripId: newTrip._id });
    user.challenges.push({ challengeId: challengeId });
    await user.save();

    res.status(201).json({
      message: "Trip added successfully",
      trip: newTrip,
      distance: distanceInKm,
      emission_grams: emissionGrams,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// const getChallengeLeaderboard = async (req, res) => {
//   try {
//     const { challengeId } = req.body;

//     // Find the challenge by challengeId
//     const challenge = await Challenge.findById(challengeId);

//     if (!challenge) {
//       return res.status(404).json({ message: "Challenge not found" });
//     }

//     // Extract the users array from the challenge
//     const users = challenge.users.map((user) => ({
//       userId: user.userId,
//       completed: user.completed,
//       completionDate: user.completionDate,
//     }));

//     // Include challenge points in the response
//     const challengePoints = challenge.challenge_points;

//     res.status(200).json({ users, challengePoints });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: "Internal server error" });
//   }
// };

// const getChallengeLeaderboard = async (req, res) => {
//   try {
//     const { userId } = req.body;

//     // Find the user by userId
//     const user = await User.findById(userId);

//     if (!user) {
//       return res.status(404).json({ message: "User not found" });
//     }

//     // Initialize the leaderboard
//     const leaderboard = [];

//     // Iterate through the user's challenges
//     for (const challengeId of user.challenges) {
//       // Find the challenge by challengeId
//       const challenge = await Challenge.findById(challengeId);

//       if (!challenge) {
//         console.warn(`Challenge not found for id: ${challengeId}`);
//         continue;
//       }

//       // Extract the relevant information from the challenge and user data
//       const challengeData = {
//         challengeId: challengeId,
//         challengeName: challenge.challengeName,
//         users: challenge.users.map((challengeUser) => {
//           const userData = user.challenges.find(
//             (userChallenge) =>
//               userChallenge.challengeId.toString() === challengeId.toString()
//           );

//           return {
//             userId: challengeUser.userId,
//             completed: challengeUser.completed,
//             completionDate: userData ? userData.completionDate : null,
//           };
//         }),
//         challengePoints: challenge.challenge_points,
//       };

//       leaderboard.push(challengeData);
//     }

//     res.status(200).json({ leaderboard });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: "Internal server error" });
//   }
// };

const getChallengeLeaderboard = async (req, res) => {
  try {
    const { userId } = req.body;

    // Find the user by userId
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Initialize the leaderboard
    const leaderboard = [];

    // Iterate through the user's challenges
    for (const userChallenge of user.challenges) {
      const challengeId = userChallenge.challengeId;

      // Find the challenge by challengeId
      const challenge = await Challenge.findById(challengeId);

      if (!challenge) {
        console.warn(`Challenge not found for id: ${challengeId}`);
        continue;
      }

      // Extract the relevant information from the challenge and user data
      const challengeData = {
        challengeId: challengeId,
        challengeName: challenge.challengeName,
        users: challenge.users.map((challengeUser) => {
          const userData = user.challenges.find(
            (userChallenge) =>
              userChallenge.challengeId.toString() === challengeId.toString()
          );

          return {
            userId: challengeUser.userId,
            completed: challengeUser.completed,
            completionDate: userData ? userData.completionDate : null,
          };
        }),
        challengePoints: challenge.challenge_points,
      };

      leaderboard.push(challengeData);
    }

    res.status(200).json({ leaderboard });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const getChallenge_user_earning_history = async (req, res) => {
  try {
    const { userId } = req.body;

    // Find the user by userId
    const user = await User.findById(userId).populate("challenges.challengeId");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Extract completed challenges and points
    const completedChallenges = user.challenges.map((challenge) => ({
      challengeId: challenge.challengeId._id,
      title: challenge.challengeId.title,
      description: challenge.challengeId.description,
      completed: challenge.completed,
      completionDate: challenge.completionDate,
      pointsEarned: challenge.challengeId.challenge_points,
    }));

    res.status(200).json({ completedChallenges });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// controllers/challengeController.js

const createRequest = async (req, res) => {
  try {
    const {
      userId,
      start_latitude,
      start_longitude,
      end_location,
      contact,
      time,
    } = req.body;

    // Check if the user is verified as disabled
    const user = await User.findById(userId);
    if (!user || !user.profile.isdisabledverify) {
      return res.status(403).json({ message: "User not verified as disabled" });
    }

    // Create a new journey request
    const newRequest = new Journey({
      start_latitude,
      start_longitude,
      user_id: userId,
      end_location,
      contact,
      time,
    });

    // Save the new journey request
    await newRequest.save();

    res
      .status(200)
      .json({ message: "Request created successfully", request: newRequest });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c; // Distance in km
  return distance;
}

const getRequestsInRadius = async (req, res) => {
  try {
    const { lat, long } = req.body;

    // Find all requests within a 5km radius
    const requests = await Journey.find({
      status: "pending", // You may adjust this condition based on your requirements
      start_latitude: { $exists: true },
      start_longitude: { $exists: true },
    });

    // Filter requests within the specified radius
    const requestsInRadius = requests.filter((request) => {
      const distance = calculateDistance(
        lat,
        long,
        request.start_latitude,
        request.start_longitude
      );

      return distance <= 5; // Adjust the radius as needed
    });

    res.status(200).json({ requests: requestsInRadius });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};
// controllers/challengeController.js
const updateJourneyStatus = async (req, res) => {
  try {
    const { exServicemenUserId, journeySchemaId } = req.body;

    // Find the JourneySchema by ID
    const journey = await Journey.findById(journeySchemaId);

    if (!journey) {
      return res.status(404).json({ message: "Journey not found" });
    }

    // Update fields
    journey.exservicemen_userid = exServicemenUserId;
    journey.status = "complete";

    // Save the updated JourneySchema
    await journey.save();

    // Check if the user exists
    const user = await User.findById(exServicemenUserId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Update user's total points and rewards
    user.profile.progress.totalPoints += 500; // Add 500 points
    user.rewards.points += 500; // Add 500 points

    // Save the updated User
    await user.save();

    res.status(200).json({ message: "Journey status updated successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = {
  addChallenge,
  getChallenges,
  addTrip,
  getChallengeLeaderboard,
  getChallenge_user_earning_history,
  createRequest,
  getRequestsInRadius,
  updateJourneyStatus,
};
