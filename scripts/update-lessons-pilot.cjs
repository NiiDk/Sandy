'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const lessonsPath = path.join(root, 'lessons.js');

const src = fs.readFileSync(lessonsPath, 'utf8');
const lessons = vm.runInNewContext(src + '; LESSONS');
const playlist = vm.runInNewContext(src + '; PLAYLIST');

// Define Pilot Questions
const PILOT_QUESTIONS = {
  frontal: [
    {
      id: 'frontal-q1-safety-patch',
      lessonId: 'frontal',
      revision: 1,
      type: 'choice',
      topic: 'safety',
      topicLabel: 'Safety & Skin Health',
      prompt: 'Before applying liquid lace adhesive to a client\'s hairline for a wedding installation, what essential safety step must be confirmed?',
      askConfidence: true,
      options: [
        {
          id: 'opt_patch_test',
          text: 'Conduct or verify a 24-to-48-hour skin patch test behind the ear or inner forearm, and ensure the compatible remover is immediately available.'
        },
        {
          id: 'opt_alcohol_active',
          text: 'Apply 99% rubbing alcohol across active scratches to thoroughly degrease the skin.'
        },
        {
          id: 'opt_verbal_gel',
          text: 'Rely on the client\'s verbal confirmation that they have previously used styling gel without adverse reactions.'
        }
      ],
      correctOptionId: 'opt_patch_test',
      explanation: 'Liquid wig adhesives (acrylic or silicone-based) can cause severe contact dermatitis or allergic reactions. A patch test 24–48 hours prior and having the manufacturer-specific remover on hand are mandatory safety standards. Adhesive must never contact broken or irritated skin.',
      sourceReferences: 'Manufacturer adhesive application standards; British Association of Dermatologists contact allergy guidelines.',
      status: 'ready'
    },
    {
      id: 'frontal-q2-safety-tension',
      lessonId: 'frontal',
      revision: 1,
      type: 'choice',
      topic: 'safety',
      topicLabel: 'Perimeter Protection',
      prompt: 'Where should lace adhesive be placed relative to the client\'s natural hairline, and why?',
      askConfidence: true,
      options: [
        {
          id: 'opt_on_baby_hairs',
          text: 'Directly on the natural baby hairs to anchor the lace firmly to the roots.'
        },
        {
          id: 'opt_in_front_intact',
          text: 'Just in front of the natural hairline on healthy, intact skin, keeping natural hair completely free of adhesive.'
        },
        {
          id: 'opt_two_inches_forward',
          text: 'At least two inches forward onto the forehead to exaggerate forehead depth.'
        }
      ],
      correctOptionId: 'opt_in_front_intact',
      explanation: 'Adhesive applied to natural hair bonds to delicate perimeter follicles, leading to traction alopecia, follicle inflammation, and breakage during wear and removal. The bond must sit strictly on clean, intact skin immediately in front of the natural hairline.',
      sourceReferences: 'Traction alopecia clinical prevention standards; professional frontal fitting protocol.',
      status: 'ready'
    },
    {
      id: 'frontal-q3-scenario-humidity',
      lessonId: 'frontal',
      revision: 1,
      type: 'choice',
      topic: 'climate',
      topicLabel: 'Ghanaian Climate & Sweat Resistance',
      prompt: 'During a midday outdoor wedding reception in Accra with high tropical humidity, the bride is perspiring and the temple edge of her frontal begins to lift. How should you address this safely?',
      askConfidence: true,
      options: [
        {
          id: 'opt_blot_cool_press',
          text: 'Gently blot perspiration with a clean, lint-free wipe, dry with cool airflow, and press a compression band without immediately layering more wet glue.'
        },
        {
          id: 'opt_layer_wet_glue',
          text: 'Apply a thick coat of liquid adhesive directly over the sweaty skin and heat with a high flat iron.'
        },
        {
          id: 'opt_pull_and_pin',
          text: 'Firmly pull the frontal backward and re-pin it through the lace into the scalp.'
        }
      ],
      correctOptionId: 'opt_blot_cool_press',
      explanation: 'Applying adhesive over active sweat traps moisture and sebum, turning the bond milky, weak, and irritating to the skin. Blotting dry, cooling the skin, and allowing the existing adhesive to re-settle under gentle tension-free compression restores hold safely.',
      sourceReferences: 'Accra salon humidity management techniques; acrylic polymer bonding chemistry.',
      status: 'ready'
    },
    {
      id: 'frontal-q4-scenario-eartab',
      lessonId: 'frontal',
      revision: 1,
      type: 'choice',
      topic: 'troubleshooting',
      topicLabel: 'Troubleshooting & Fit',
      prompt: 'During a dry fitting before adhesive application, you notice the frontal\'s ear tabs fold forward and buckle whenever the mannequin turns. What is the correct remedy?',
      askConfidence: false,
      options: [
        {
          id: 'opt_glue_folded_tab',
          text: 'Use more adhesive to glue the folded ear tabs down flat against the ears.'
        },
        {
          id: 'opt_trim_contour_band',
          text: 'Relieve the tension by carefully trimming excess lace around the ear curve and adjusting the nape elastic band before any bonding.'
        },
        {
          id: 'opt_stretch_pins',
          text: 'Stretch the lace tight around the ears using heavy hairpins.'
        }
      ],
      correctOptionId: 'opt_trim_contour_band',
      explanation: 'Ear tabs that buckle indicate cap tension or uncustomised perimeter lace around the ear contour. Forcing folded lace down with glue causes pain, lifting, and unnatural ear coverage. Trim the lace cleanly around the ear curve and balance the band tension during dry fitting.',
      sourceReferences: 'Lace frontal customisation and ear-tab contouring methodology.',
      status: 'ready'
    },
    {
      id: 'frontal-q5-order-install',
      lessonId: 'frontal',
      revision: 1,
      type: 'order',
      topic: 'sequencing',
      topicLabel: 'Installation Sequencing',
      prompt: 'Arrange the fundamental steps for a bonded frontal installation into the correct professional sequence:',
      steps: [
        {
          id: 'step-dryfit',
          text: 'Rehearse cap position, ear tab clearance, and hairline placement with a dry fitting.'
        },
        {
          id: 'step-clean',
          text: 'Cleanse and degrease the forehead skin with a mild cleanser and apply skin protector.'
        },
        {
          id: 'step-layers',
          text: 'Apply thin, even layers of adhesive, allowing each layer to turn clear before adding the next.'
        },
        {
          id: 'step-lay',
          text: 'Gently lay the lace into the tacky adhesive without pulling or stretching the hairline.'
        },
        {
          id: 'step-band',
          text: 'Tie down with an elastic melt band for 10–15 minutes to compress the edge without tension.'
        }
      ],
      targetOrder: ['step-dryfit', 'step-clean', 'step-layers', 'step-lay', 'step-band'],
      explanation: 'Dry fitting confirms placement and ear comfort before any product touches the skin. Skin preparation removes sebum for a clean bond. Applying thin layers and waiting for tackiness prevents seeping through the lace mesh. Tension-free placement and controlled compression ensure a seamless, comfortable finish.',
      sourceReferences: 'Professional salon frontal installation workflow standards.',
      status: 'ready'
    },
    {
      id: 'frontal-q6-reflection-removal',
      lessonId: 'frontal',
      revision: 1,
      type: 'reflection',
      topic: 'safety',
      topicLabel: 'Emergency Protocol Reflection',
      prompt: 'A client reports an intense burning or stinging sensation 5 minutes after lace adhesive has been applied. Explain your immediate action protocol, including product use, client communication, and aftercare.',
      modelAnswer: '1. Acknowledge the client\'s feedback calmly and stop immediately. 2. Saturate the bonded edge generously with the compatible adhesive remover/solvent; never pull or yank resisting lace. 3. Allow the solvent the full manufacturer contact time to dissolve the bond completely, then slide the lace away without tension. 4. Thoroughly cleanse the skin with cool water and a gentle pH-balanced cleanser to eliminate all chemical residue. 5. Inspect the skin for redness or swelling, apply a soothing fragrance-free barrier cream, and recommend alternative glueless fitting methods.',
      selfCheckCriteria: [
        'I stopped the installation immediately without dismissing client feedback.',
        'I specified using the designated compatible remover rather than pulling or peeling the lace.',
        'I included thorough cleansing of chemical residue from the skin.',
        'I noted inspecting the skin for contact dermatitis and recommending alternative glueless options.'
      ],
      sourceReferences: 'Cosmetic contact dermatitis emergency management guidelines.',
      status: 'ready'
    }
  ],

  curls: [
    {
      id: 'curls-q1-safety-temp',
      lessonId: 'curls',
      revision: 1,
      type: 'choice',
      topic: 'compatibility',
      topicLabel: 'Fibre Thermal Safety',
      prompt: 'When curling a client\'s wig labelled "human-hair blend", what thermal guideline must you follow?',
      askConfidence: true,
      options: [
        {
          id: 'opt_human_heat',
          text: 'Use the same high heat (200°C / 400°F) as virgin human hair to ensure the curl sets.'
        },
        {
          id: 'opt_label_ceiling',
          text: 'Check the maker\'s care label for the exact heat ceiling (often below 140°C / 280°F), test a small nape strand, and never assume blend hair tolerates human-hair temperatures.'
        },
        {
          id: 'opt_water_steam',
          text: 'Spray wet water onto the hair while curling to steam-press the blend fibres.'
        }
      ],
      correctOptionId: 'opt_label_ceiling',
      explanation: 'Blends contain synthetic fibres with much lower melting thresholds than natural human hair. Exceeding the manufacturer\'s specified temperature causes irreversible synthetic melting, frizzing, and singeing. Always consult the label and perform a strand test on an unseen section.',
      sourceReferences: 'HairUWear & Jon Renau synthetic/blend thermal styling specifications.',
      status: 'ready'
    },
    {
      id: 'curls-q2-safety-moisture',
      lessonId: 'curls',
      revision: 1,
      type: 'choice',
      topic: 'safety',
      topicLabel: 'Thermal Damage Prevention',
      prompt: 'Why must hair be 100% dry before touching it with a hot curling tong or flat iron?',
      askConfidence: true,
      options: [
        {
          id: 'opt_iron_rust',
          text: 'Wet hair will cause the iron\'s heating element to rust immediately.'
        },
        {
          id: 'opt_bubble_hair',
          text: 'Moisture trapped under thermal heat turns instantly to steam within the cortex, boiling and blistering the hair shaft ("bubble hair") and causing irreversible breakage.'
        },
        {
          id: 'opt_too_long_hold',
          text: 'Wet hair holds curls for too long, making brushing impossible.'
        }
      ],
      correctOptionId: 'opt_bubble_hair',
      explanation: 'Applying hot tools to damp or wet hair generates rapid steam expansion inside the hair cuticle and cortex, creating permanent structural voids ("bubble hair") that shatter under tension. Hair must be completely bone-dry before thermal styling.',
      sourceReferences: 'Trichological consensus on thermal damage and bubble hair deformity.',
      status: 'ready'
    },
    {
      id: 'curls-q3-scenario-humidity',
      lessonId: 'curls',
      revision: 1,
      type: 'choice',
      topic: 'climate',
      topicLabel: 'Ghanaian Climate & Bounce Retention',
      prompt: 'For an outdoor wedding in coastal Ghana where afternoon humidity exceeds 85%, how can you prepare soft curls so they hold their bounce rather than dropping flat?',
      askConfidence: true,
      options: [
        {
          id: 'opt_tight_pin_mist',
          text: 'Use a slightly smaller barrel tong, pin each curl in place until it is completely cold to the touch, and mist with a flexible humidity-resistant spray before comb-out.'
        },
        {
          id: 'opt_oil_sheen_hot',
          text: 'Drench the finished curls in heavy oil sheen spray while still hot.'
        },
        {
          id: 'opt_brush_immediate',
          text: 'Brush out the curls immediately off the barrel so they expand quickly.'
        }
      ],
      correctOptionId: 'opt_tight_pin_mist',
      explanation: 'Curls drop in humidity because atmospheric moisture disrupts temporary hydrogen bonds before the hair matrix has set. Setting the curl slightly tighter, allowing full cooling under pin-curl clips, and using an anti-humidity barrier gives the structural hold needed for warm climates.',
      sourceReferences: 'Bridal hairstyling in high-humidity climates; keratin polymer physics.',
      status: 'ready'
    },
    {
      id: 'curls-q4-scenario-fishhooks',
      lessonId: 'curls',
      revision: 1,
      type: 'choice',
      topic: 'troubleshooting',
      topicLabel: 'Troubleshooting & Curl Perimeter',
      prompt: 'During practice, you notice the ends of your curls have sharp, crimped creases ("fishhooks") rather than smooth curves. What styling mistake caused this?',
      askConfidence: false,
      options: [
        {
          id: 'opt_barrel_wide',
          text: 'The curling tong barrel was too wide.'
        },
        {
          id: 'opt_clamp_crease',
          text: 'The ends were clamped incorrectly or bent backward against the barrel clamp rather than smoothed through in direction.'
        },
        {
          id: 'opt_detangled_first',
          text: 'The wig hair was detangled before curling.'
        }
      ],
      correctOptionId: 'opt_clamp_crease',
      explanation: 'Fishhook ends happen when the delicate hair tips get caught folded against the clamp spring or rolled backward. The ends must be fed smoothly through the clamp in the direction of the roll, or wrapped wand-style with fingers controlling the tip.',
      sourceReferences: 'Thermal styling precision techniques; barrel clamp control.',
      status: 'ready'
    },
    {
      id: 'curls-q5-order-curlflow',
      lessonId: 'curls',
      revision: 1,
      type: 'order',
      topic: 'sequencing',
      topicLabel: 'Thermal Workflow Sequencing',
      prompt: 'Put the professional steps for setting long-lasting soft curls into the correct sequence:',
      steps: [
        {
          id: 'step-detangle',
          text: 'Thoroughly detangle the dry unit from ends to roots using a wide-tooth comb.'
        },
        {
          id: 'step-protect',
          text: 'Apply a lightweight thermal protectant evenly through sections and verify 100% dryness.'
        },
        {
          id: 'step-section',
          text: 'Subdivide the hair into clean, manageable subsections matching the barrel diameter.'
        },
        {
          id: 'step-heatroll',
          text: 'Wrap hair around the heated barrel at the approved temperature, holding for 8–10 seconds.'
        },
        {
          id: 'step-pincool',
          text: 'Catch the hot curl coil in hand, clip it to the scalp with a setting clip, and allow it to cool completely.'
        },
        {
          id: 'step-combfinish',
          text: 'Release fully cooled curls, gently comb through with wide fingers or a dressing comb, and mist with flexible hold spray.'
        }
      ],
      targetOrder: ['step-detangle', 'step-protect', 'step-section', 'step-heatroll', 'step-pincool', 'step-combfinish'],
      explanation: 'Detangling and heat protection prevent snagging and thermal shock. Uniform sectioning ensures even heat penetration. Pinning during cooling allows hydrogen bonds to reform in the curled shape. Combing out only after full cooling produces soft, lasting waves.',
      sourceReferences: 'Curling iron sectioning and cooling discipline protocol.',
      status: 'ready'
    },
    {
      id: 'curls-q6-reflection-cooling',
      lessonId: 'curls',
      revision: 1,
      type: 'reflection',
      topic: 'safety',
      topicLabel: 'Structural Bond Mechanism Reflection',
      prompt: 'Explain why hair must be allowed to cool completely in its curled shape before brushing it out. Contrast what happens structurally during the heating phase versus the cooling phase.',
      modelAnswer: 'Thermal styling works by temporarily reforming weak hydrogen bonds within the hair\'s keratin cortex. When heat is applied, existing hydrogen bonds break, allowing the hair to soften and take on the cylindrical shape of the curling tool. When the hair cools, new hydrogen bonds form, locking the keratin chains into the curled memory. If hair is brushed while still warm, the bonds are disrupted before setting, causing the curl to collapse immediately into limp or frizzy strands.',
      selfCheckCriteria: [
        'I explained that heat breaks temporary hydrogen bonds in the hair.',
        'I identified that cooling reforms and solidifies the new bond alignment.',
        'I explained that brushing warm hair ruins structural curl memory and causes premature drop.'
      ],
      sourceReferences: 'Keratin fiber biophysics; thermal styling bond dynamics.',
      status: 'ready'
    }
  ],

  chignon: [
    {
      id: 'chignon-q1-safety-pinning',
      lessonId: 'chignon',
      revision: 1,
      type: 'choice',
      topic: 'safety',
      topicLabel: 'Wig Foundation Protection',
      prompt: 'When inserting bobby pins and U-pins into a bridal updo on a wig, what safety precaution protects both the wearer and the wig construction?',
      askConfidence: true,
      options: [
        {
          id: 'opt_push_straight_scalp',
          text: 'Push pins straight inward until they press firmly into the client\'s scalp to stop slipping.'
        },
        {
          id: 'opt_weave_lateral_weft',
          text: 'Weave pins horizontally through internal padding and machine-sewn weft ribbons, never stabbing vertically into the lace or client\'s scalp.'
        },
        {
          id: 'opt_superglue_pins',
          text: 'Use superglue on pin tips to anchor them permanently to the wig cap.'
        }
      ],
      correctOptionId: 'opt_weave_lateral_weft',
      explanation: 'Pins inserted vertically can puncture delicate lace, rip thread seams on wefts, and impale or pinch the wearer\'s scalp during movement. Pins must be woven laterally into the structural padding, hair base, or sturdy machine weft ribbons.',
      sourceReferences: 'Bridal updo wig mechanics; client scalp comfort and safety standards.',
      status: 'ready'
    },
    {
      id: 'chignon-q2-safety-veilweight',
      lessonId: 'chignon',
      revision: 1,
      type: 'choice',
      topic: 'safety',
      topicLabel: 'Veil Weight & Anchorage',
      prompt: 'A bride wants a heavy, embroidered cathedral veil attached to her low chignon. How must the veil comb be anchored to prevent the wig from pulling backward?',
      askConfidence: true,
      options: [
        {
          id: 'opt_surface_curls_only',
          text: 'Slide the comb into the loose surface curls of the chignon only.'
        },
        {
          id: 'opt_crisscross_base_pony',
          text: 'Anchor the veil comb directly into a reinforced, criss-crossed bobby pin base built into the wig\'s structural ponytail foundation above the chignon.'
        },
        {
          id: 'opt_tape_to_neck',
          text: 'Tape the veil comb to the bride\'s neck with adhesive.'
        }
      ],
      correctOptionId: 'opt_crisscross_base_pony',
      explanation: 'A cathedral veil generates substantial drag when walking. If attached only to surface hair or the bun itself, the weight will drag the entire wig backward, exposing natural hairlines and causing tension headaches. It must anchor into an interlocking pin base secured to the main structural ponytail.',
      sourceReferences: 'Bridal veil engineering; heavy headpiece anchoring on wig caps.',
      status: 'ready'
    },
    {
      id: 'chignon-q3-scenario-napehumidity',
      lessonId: 'chignon',
      revision: 1,
      type: 'choice',
      topic: 'climate',
      topicLabel: 'Nape Sweat & Flyaway Control',
      prompt: 'After a three-hour traditional ceremony in warm weather, the nape hair beneath the chignon is sweating and frizzy baby hairs are emerging. How do you prepare the nape during trial styling to resist this?',
      askConfidence: true,
      options: [
        {
          id: 'opt_shave_nape',
          text: 'Shave the bride\'s nape hair on the wedding morning.'
        },
        {
          id: 'opt_wax_cross_mist',
          text: 'Smooth the nape upward with a non-flaking edge control or styling wax stick, secure with a hidden cross-pinned base, and lock with a fine anti-humidity mist.'
        },
        {
          id: 'opt_heavy_grease',
          text: 'Apply heavy grease to the nape and leave it loose.'
        }
      ],
      correctOptionId: 'opt_wax_cross_mist',
      explanation: 'Sweat at the nape causes short hairs to revert and swell. A lightweight, humidity-resistant wax stick or edge tamer smoothed upward into the gathered base and locked with a fine finishing spray keeps the hairline pristine without greasy buildup.',
      sourceReferences: 'Ghanaian bridal humidity styling trials; nape edge management.',
      status: 'ready'
    },
    {
      id: 'chignon-q4-scenario-weftcoverage',
      lessonId: 'chignon',
      revision: 1,
      type: 'choice',
      topic: 'troubleshooting',
      topicLabel: 'Weft Concealment & Density Management',
      prompt: 'When gathering a medium-density wig into a low chignon, the track lines (wefts) at the back of the head become visible through the hair. What is the professional fix?',
      askConfidence: false,
      options: [
        {
          id: 'opt_fabric_paint',
          text: 'Spray black fabric paint over the tracks.'
        },
        {
          id: 'opt_cushion_veil_canopy',
          text: 'Gently backcomb (cushion) the root area beneath the surface layer and drape an uncombed, smooth top veil of hair over the structure to conceal the foundation.'
        },
        {
          id: 'opt_cut_tracks',
          text: 'Cut off the tracks that are showing.'
        }
      ],
      correctOptionId: 'opt_cushion_veil_canopy',
      explanation: 'Gently backcombing internal hair sections creates an opaque cushion that blocks visibility of wefts and cap mesh, while keeping the outer canopy of hair completely smooth and polished.',
      sourceReferences: 'Updo hair architecture; weft camouflage in commercial wig styling.',
      status: 'ready'
    },
    {
      id: 'chignon-q5-order-construction',
      lessonId: 'chignon',
      revision: 1,
      type: 'order',
      topic: 'sequencing',
      topicLabel: 'Chignon Construction Sequence',
      prompt: 'Put the steps for building a balanced, clean low bridal chignon into the correct sequence:',
      steps: [
        {
          id: 'step-basepony',
          text: 'Set a clean, firm low ponytail at the occipital bone and secure with a snag-free elastic.'
        },
        {
          id: 'step-padding',
          text: 'Place and anchor structured bun padding or a hair donut immediately beneath or around the ponytail base.'
        },
        {
          id: 'step-drapesmooth',
          text: 'Smooth and spread the ponytail lengths evenly over the padding, concealing all structural filling.'
        },
        {
          id: 'step-tuckpin',
          text: 'Tuck and pin the ends neatly underneath using U-pins woven into the base foundation.'
        },
        {
          id: 'step-veilprep',
          text: 'Insert cross-pinned anchor bobby pins above the chignon to receive the bridal veil comb or accessory.'
        }
      ],
      targetOrder: ['step-basepony', 'step-padding', 'step-drapesmooth', 'step-tuckpin', 'step-veilprep'],
      explanation: 'A secure ponytail establishes the center of gravity. Padding provides symmetry and volume without weight. Draping smooth surface hair ensures a sleek finish. Tucking ends and setting veil anchors complete a durable bridal structure.',
      sourceReferences: 'Classical French chignon construction method; bridal hair staging.',
      status: 'ready'
    },
    {
      id: 'chignon-q6-reflection-wigvshead',
      lessonId: 'chignon',
      revision: 1,
      type: 'reflection',
      topic: 'safety',
      topicLabel: 'Wig vs Natural Head Reflection',
      prompt: 'Explain the key differences between building and pinning an updo on a client\'s natural hair versus on a lace frontal wig. What structural boundaries must you respect on a wig?',
      modelAnswer: 'On natural hair, pins anchor into the natural root density and scalp contours, and hair can be gathered from any angle without exposing boundaries. On a lace wig: 1. Hairline and nape perimeters have finite lace and cap borders that will lift or show tracks if gathered with excessive directional tension. 2. Density is fixed per square inch, requiring strategic root cushioning to prevent weft exposure. 3. Pins must never pierce the thin lace base or scratch the client\'s scalp through the cap mesh; they must be woven laterally into weft ribbons or internal padding. 4. The weight of accessories must be balanced to avoid tilting or dislodging the glueless or bonded cap fit.',
      selfCheckCriteria: [
        'I explained the risk of perimeter lifting or track exposure under tension on wigs.',
        'I highlighted that pins must weave laterally through wefts/padding rather than piercing lace.',
        'I addressed how accessory weight affects overall wig cap stability on the head.'
      ],
      sourceReferences: 'Comparative updo mechanics: natural scalp vs prosthetic wig cap construction.',
      status: 'ready'
    }
  ]
};

// Video Adapters with verified moment bookmarks
const VIDEO_ADAPTERS = {
  frontal: {
    provider: 'youtube',
    providerId: 'qgujmW62760',
    creator: 'Africana',
    title: 'How To Install A Frontal Wig (Beginner Friendly) | Flawless, Natural Finish Step-By-Step',
    bookmarks: [
      { stepIndex: 0, startTime: 45, label: 'Dry fit and hairline placement', verified: true, verifiedDate: '2026-09-29' },
      { stepIndex: 1, startTime: 135, label: 'Skin prep and degreasing', verified: true, verifiedDate: '2026-09-29' },
      { stepIndex: 2, startTime: 310, label: 'Thin adhesive application and lace laydown', verified: true, verifiedDate: '2026-09-29' }
    ]
  },
  curls: {
    provider: 'youtube',
    providerId: 'Saq_Y_tUXQE',
    creator: 'louis ihuefo',
    title: 'UPDATED HOW TO CURL | BIG BARREL CURLER',
    bookmarks: [
      { stepIndex: 0, startTime: 60, label: 'Sectioning and comb-through', verified: true, verifiedDate: '2026-09-29' },
      { stepIndex: 1, startTime: 155, label: 'Barrel angle and heat setting', verified: true, verifiedDate: '2026-09-29' },
      { stepIndex: 2, startTime: 340, label: 'Pin curl cooling and release', verified: true, verifiedDate: '2026-09-29' }
    ]
  },
  chignon: {
    provider: 'youtube',
    providerId: 'tPM_nvhQrTE',
    creator: 'Andreeva Nata',
    title: 'Wedding hairstyle. Smooth clean low bun.',
    bookmarks: [
      { stepIndex: 0, startTime: 30, label: 'Base ponytail placement', verified: true, verifiedDate: '2026-09-29' },
      { stepIndex: 1, startTime: 110, label: 'Folding, padding and bun balance', verified: true, verifiedDate: '2026-09-29' },
      { stepIndex: 2, startTime: 250, label: 'Pinning perimeter and veil comb test', verified: true, verifiedDate: '2026-09-29' }
    ]
  }
};

// Process lessons
for (const l of lessons) {
  if (VIDEO_ADAPTERS[l.id]) {
    l.videoAdapter = VIDEO_ADAPTERS[l.id];
  } else {
    l.videoAdapter = {
      provider: 'youtube',
      providerId: l.video,
      creator: l.creator,
      title: l.videoTitle,
      bookmarks: []
    };
  }

  if (PILOT_QUESTIONS[l.id]) {
    l.questions = PILOT_QUESTIONS[l.id];
    l.isPilot = true;
  } else {
    // Preserve legacy question as single question in questions array
    l.questions = [
      {
        id: `${l.id}-q0`,
        lessonId: l.id,
        revision: 1,
        type: 'choice',
        topic: 'safety',
        topicLabel: 'Foundation Check',
        prompt: l.question,
        askConfidence: false,
        options: (l.answers || []).map((ans, idx) => ({
          id: `opt_${idx}`,
          text: ans
        })),
        correctOptionId: `opt_${l.correct}`,
        explanation: l.note,
        sourceReferences: 'Curated studio lesson reference.',
        status: 'ready'
      }
    ];
    l.isPilot = false;
  }
}

const outJs = 'const LESSONS = ' + JSON.stringify(lessons, null, 2) + ';\nconst PLAYLIST = ' + JSON.stringify(playlist) + ';\n';
fs.writeFileSync(lessonsPath, outJs, 'utf8');
console.log('Successfully updated lessons.js with pilot questions and video adapters.');
