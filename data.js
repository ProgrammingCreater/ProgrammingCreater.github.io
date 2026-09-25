// ----------------------------------------------------------------------------
// PROJECTS — edit this array to add / remove / update your own projects.
// This is the exact same data model as the old Streamlit app, just in JS.
//
// Notes on fields:
// - "images": list of image entries. Each entry can be EITHER:
//     * a plain string path/URL, e.g. "RC_Car/Isometric.jpeg", or
//     * an object for when a photo needs manual rotation correction, e.g.
//       { path: "RC_Car/Isometric.jpeg", rotate: 90 }
//   "rotate" is clockwise degrees (try 90, 180, or 270 until it looks right).
//   Use forward slashes in paths, and keep image files in folders next to
//   index.html (see README.md).
// - "video_url": a YouTube/Vimeo embed link OR a direct .mp4 path. Leave as
//   "" if there's no demo video.
// - "errors_encountered": list of { issue, solution } describing bugs you
//   hit and how you fixed them. Leave as [] if none.
// ----------------------------------------------------------------------------
const PROJECTS = [
  {
    title: "RC Obstacle-Avoidance Car",
    summary:
      "A four-wheeled robot that is controlled by a remote and has obstacle detection using an ultrasonic sensor.",
    full_description:
      "Designed, built, and programmed a fully custom autonomous obstacle-avoidance car, " +
      "3D-printing the entire chassis and fasteners from an Onshape CAD model and integrating " +
      "an Arduino Uno, L298N motor driver, HC-SR04 ultrasonic sensor, and TSOP34S40 IR receiver, " +
      "all documented in a complete KiCad schematic. Along the way, I redesigned the drivetrain " +
      "to a rear-wheel-drive layout after parts constraints limited me to two motors, reinforced " +
      "3D-printed fasteners that were failing under motor-mount stress, diagnosed and corrected " +
      "a ~20% speed discrepancy between the drive motors by adding per-motor PWM compensation in firmware, " +
      "and traced erratic ultrasonic readings to electrical interference from a shared breadboard with the " +
      "IR receiver — resolving it by separating the sensors onto different boards, which also let me reposition " +
      "the ultrasonic sensor for better front-facing coverage. The project brought together CAD design, " +
      "DFM considerations for 3D printing, circuit design, and embedded C++, and reinforced how much of engineering " +
      "is diagnosing why something isn't working before you can fix it.",
    tags: ["Onshape", "KiCad", "Arduino", "C++"],
    images: [
      { path: "RC_Car/Isometric.png", rotate: 270 },
      "RC_Car/Top.jpeg",
      "RC_Car/Schematic.png",
    ],
    video_url: "",
    repo_url: "https://github.com/ProgrammingCreater/RC_CAR",
    demo_url: "",
    status: "Completed",
    errors_encountered: [
      {
        issue:
          "Parts constraints forced a redesign as I did not have the four wheels/motors available that most reference builds use.",
        solution:
          "I redesigned the drivetrain around a rear-wheel-drive layout (inspired by modern car architecture) " +
          "with two driven wheels and two free-rolling casters — which also improved weight distribution and structural support.",
      },
      {
        issue:
          "The ultrasonic sensor was reading erratically. I traced the issue to electrical interference from sharing a breadboard with the IR sensor.",
        solution:
          "I moved the ultrasonic sensor to a separate breadboard, further from the IR sensor, which resolved the noise. " +
          "This also allowed me to relocate it to a better front-mounted position for improved obstacle detection.",
      },
      {
        issue: "The car wouldn't drive straight on flat surfaces.",
        solution:
          "After investigating, I found the two drive motors — despite being \"identical\" — ran at meaningfully different " +
          "speeds under the same PWM signal. I diagnosed this with direct testing and corrected it with a per-motor PWM " +
          "compensation factor of 20% in firmware, resolving the veering issue.",
      },
    ],
  },
];
