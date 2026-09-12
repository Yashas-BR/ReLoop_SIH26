import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';

import {
    ActivityIndicator,
    Alert,
    Image,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';

import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import * as ImageManipulator from 'expo-image-manipulator';

import {
    createLot,
    DEFAULT_LAT,
    DEFAULT_LNG,
    DEFAULT_LOCATION,
    DEMO_COLLECTOR_ID,
    getInstantValuation,
    MATERIAL_CATEGORIES,
    submitAiFeedback,
    updateAiFeedback,
} from '../../../api/client';

import {
    currentCollectorId,
    getSession,
} from '../../../services/auth';
import { BrandedHeader } from '../../components/branding/BrandedHeader';
import { useTranslation } from '../../../i18n/config';

/* =========================================================
   THIRD-PARTY JS DECODERS
========================================================= */

const jpeg = require('jpeg-js');
const base64js = require('base64-js');

/* =========================================================
   CONSTANTS
========================================================= */

const LOCATIONS = [
    'Bengaluru',
    'Delhi',
    'Mumbai',
    'Hyderabad',
    'Chennai',
    'Pune',
    'Kolkata',
    'Ahmedabad',
    'Jaipur',
];

const MAX_PHOTOS = 3;

const CATEGORY_IDS = [
    'CRT',
    'LCD',
    'PCB',
    'Cable',
    'Battery',
    'Motor',
    'Plastic',
];

const SAMPLE_SIZE = 64;

const PIPELINE = [
    'capture',
    'segment',
    'featExtract',
    'hueMap',
    'classify',
];

/* =========================================================
   TYPES
========================================================= */

type PhotoItem = {
    uri: string;
    base64?: string | null;
    mimeType?: string | null;
};

type Valuation = {
    benchmark_available?: boolean;
    estimated_value?: number;
    unit_price?: number;
    market_benchmark?: number;
    market_range_low?: number;
    market_range_high?: number;
};

type Features = {
    meanLum: number;
    meanSat: number;
    satVar: number;
    edge: number;
    darkFrac: number;
    brightFrac: number;
    q75: number;

    green: number;
    blue: number;
    copper: number;
    red: number;
    purple: number;
    neutral: number;
};

type Candidate = {
    category: string;
    confidence: number;
};

type ClassificationResult = {
    category: string;
    confidence: number;
    verdict: 'low' | 'medium' | 'high';
    candidates: Candidate[];
    features: Features;
};

type Pixel = {
    r: number;
    g: number;
    b: number;
};

/* =========================================================
   ORIGINAL RULE-BASED CLASSIFIER
========================================================= */

function rgbToHsl({
    r,
    g,
    b,
}: Pixel) {
    const rn = r / 255;
    const gn = g / 255;
    const bn = b / 255;

    const max = Math.max(
        rn,
        gn,
        bn
    );

    const min = Math.min(
        rn,
        gn,
        bn
    );

    const l =
        (max + min) / 2;

    const d =
        max - min;

    let s = 0;
    let h = 0;

    if (d !== 0) {
        s =
            l > 0.5
                ? d /
                (2 - max - min)
                : d /
                (max + min);

        if (max === rn) {
            h =
                ((gn - bn) / d +
                    (gn < bn ? 6 : 0)) *
                60;
        } else if (max === gn) {
            h =
                ((bn - rn) / d +
                    2) *
                60;
        } else {
            h =
                ((rn - gn) / d +
                    4) *
                60;
        }
    }

    return {
        h,
        s,
        l,
    };
}

function luminance({
    r,
    g,
    b,
}: Pixel) {
    return (
        (0.299 * r +
            0.587 * g +
            0.114 * b) /
        255
    );
}

/* =========================================================
   FEATURE EXTRACTION
========================================================= */

function collectFeatures(
    pixels: Pixel[]
): Features {
    const n =
        pixels.length;

    let lumSum = 0;
    let satSum = 0;

    let darkCount = 0;
    let brightCount = 0;

    const hueBins = {
        green: 0,
        blue: 0,
        copper: 0,
        red: 0,
        neutral: 0,
        purple: 0,
    };

    const satValues: number[] =
        [];

    for (
        let i = 0;
        i < n;
        i++
    ) {
        const {
            h,
            s,
            l,
        } = rgbToHsl(
            pixels[i]
        );

        lumSum += l;
        satSum += s;

        satValues.push(s);

        if (l < 0.22) {
            darkCount++;
        }

        if (l > 0.8) {
            brightCount++;
        }

        if (s < 0.12) {
            hueBins.neutral++;
        } else if (
            h >= 60 &&
            h < 170
        ) {
            hueBins.green++;
        } else if (
            h >= 170 &&
            h < 250
        ) {
            hueBins.blue++;
        } else if (
            h >= 20 &&
            h < 60
        ) {
            hueBins.green++;
        } else if (
            (h >= 0 &&
                h < 20) ||
            h >= 330
        ) {
            hueBins.red++;
        } else if (
            h >= 250 &&
            h < 330
        ) {
            hueBins.purple++;
        } else {
            hueBins.copper++;
        }
    }

    satValues.sort(
        (a, b) => a - b
    );

    const q75 =
        satValues[
        Math.floor(
            n * 0.75
        )
        ] || 0;

    let edgeSum = 0;

    /*
     * Image is converted to exactly
     * 64 x 64 before this function.
     */
    for (
        let y = 1;
        y < SAMPLE_SIZE;
        y++
    ) {
        for (
            let x = 1;
            x < SAMPLE_SIZE;
            x++
        ) {
            const index =
                y *
                SAMPLE_SIZE +
                x;

            if (
                index >= n
            ) {
                continue;
            }

            const current =
                pixels[index];

            const up =
                pixels[
                (y - 1) *
                SAMPLE_SIZE +
                x
                ];

            const left =
                pixels[
                y *
                SAMPLE_SIZE +
                (x - 1)
                ];

            if (
                !current ||
                !up ||
                !left
            ) {
                continue;
            }

            const dl =
                Math.abs(
                    luminance(
                        current
                    ) -
                    luminance(up)
                );

            const dr =
                Math.abs(
                    luminance(
                        current
                    ) -
                    luminance(left)
                );

            edgeSum +=
                Math.max(
                    dl,
                    dr
                );
        }
    }

    edgeSum /=
        Math.max(1, n);

    const meanSat =
        satSum / n;

    const variance =
        satValues.length
            ? satValues.reduce(
                (
                    acc,
                    value
                ) =>
                    acc +
                    (value -
                        meanSat) **
                    2,
                0
            ) /
            satValues.length
            : 0;

    const total =
        n -
        hueBins.neutral ||
        1;

    const hueRatios = {
        green:
            hueBins.green /
            total,

        blue:
            hueBins.blue /
            total,

        copper:
            hueBins.copper /
            total,

        red:
            hueBins.red /
            total,

        purple:
            hueBins.purple /
            total,

        neutral:
            hueBins.neutral /
            n,
    };

    const meanLum =
        lumSum / n;

    return {
        meanLum,
        meanSat,

        satVar:
            Math.sqrt(
                variance
            ),

        edge:
            edgeSum,

        darkFrac:
            darkCount / n,

        brightFrac:
            brightCount / n,

        q75,

        ...hueRatios,
    };
}

/* =========================================================
   RULE SCORING
========================================================= */

function fitRange(
    value: number,
    min:
        | number
        | null,
    max:
        | number
        | null
) {
    if (
        value == null
    ) {
        return 0;
    }

    if (
        min != null &&
        value < min
    ) {
        return Math.max(
            0,
            1 -
            (min -
                value) *
            3
        );
    }

    if (
        max != null &&
        value > max
    ) {
        return Math.max(
            0,
            1 -
            (value -
                max) *
            3
        );
    }

    return 1;
}

type Rule = [
    keyof Features,
    number | null,
    number | null,
    number?
];

function categoryFit(
    features: Features,
    rules: Rule[]
) {
    let total = 0;
    let weightSum = 0;

    for (
        const rule of rules
    ) {
        const [
            feature,
            min,
            max,
            ruleWeight = 1,
        ] = rule;

        total +=
            fitRange(
                features[
                feature
                ],
                min,
                max
            ) *
            ruleWeight;

        weightSum +=
            ruleWeight;
    }

    return weightSum
        ? total /
        weightSum
        : 0;
}

/* =========================================================
   SAME RULES AS WEB APP
========================================================= */

const RULES: Record<
    string,
    Rule[]
> = {
    CRT: [
        [
            'darkFrac',
            0.35,
            null,
            3,
        ],

        [
            'meanLum',
            null,
            0.4,
            1.5,
        ],

        [
            'meanSat',
            null,
            0.2,
            1.5,
        ],

        [
            'purple',
            0.03,
            null,
            1,
        ],
    ],

    LCD: [
        [
            'edge',
            null,
            0.12,
            2.5,
        ],

        [
            'meanLum',
            0.1,
            0.5,
            1,
        ],

        [
            'meanSat',
            null,
            0.28,
            1,
        ],

        [
            'green',
            null,
            0.3,
            1,
        ],
    ],

    PCB: [
        [
            'green',
            0.18,
            null,
            3,
        ],

        [
            'edge',
            0.18,
            null,
            2.5,
        ],

        [
            'copper',
            0.03,
            null,
            1.5,
        ],

        [
            'blue',
            null,
            0.4,
            1,
        ],
    ],

    Cable: [
        [
            'satVar',
            0.14,
            null,
            5,
        ],

        [
            'meanSat',
            0.2,
            null,
            2,
        ],

        [
            'edge',
            0.16,
            null,
            1.5,
        ],

        [
            'red',
            0.03,
            null,
            1.5,
        ],

        [
            'green',
            0.02,
            0.4,
            0.5,
        ],

        [
            'blue',
            0.02,
            0.4,
            0.5,
        ],
    ],

    Battery: [
        [
            'neutral',
            0.55,
            null,
            3,
        ],

        [
            'meanSat',
            null,
            0.3,
            1.5,
        ],

        [
            'meanLum',
            0.28,
            0.72,
            1,
        ],

        [
            'edge',
            0.05,
            0.35,
            1,
        ],

        [
            'copper',
            null,
            0.1,
            1.5,
        ],
    ],

    Motor: [
        [
            'copper',
            0.08,
            null,
            3,
        ],

        [
            'edge',
            0.18,
            null,
            2,
        ],

        [
            'neutral',
            0.2,
            null,
            1,
        ],

        [
            'meanLum',
            0.3,
            0.75,
            1,
        ],
    ],

    Plastic: [
        [
            'edge',
            null,
            0.16,
            3,
        ],

        [
            'meanSat',
            0.06,
            0.6,
            1.5,
        ],

        [
            'copper',
            null,
            0.12,
            1,
        ],

        [
            'green',
            null,
            0.3,
            1,
        ],
    ],
};

const MAGNIFY = 6;

function softMax(
    scores: Record<
        string,
        number
    >
) {
    const exp =
        Object.entries(
            scores
        ).map(
            ([key, value]) => [
                key,
                Math.exp(value),
            ]
        );

    const sum =
        exp.reduce(
            (
                acc,
                [, value]
            ) =>
                acc +
                Number(value),
            0
        ) || 1;

    return Object.fromEntries(
        exp.map(
            ([key, value]) => [
                key,
                Number(value) /
                sum,
            ]
        )
    );
}

function classifyFeatures(
    features: Features
): Candidate[] {
    const raw: Record<
        string,
        number
    > = {};

    for (
        const id of
        CATEGORY_IDS
    ) {
        raw[id] =
            Math.pow(
                categoryFit(
                    features,
                    RULES[id]
                ),
                MAGNIFY
            );
    }

    const probabilities =
        softMax(raw);

    return Object.entries(
        probabilities
    )
        .sort(
            (a, b) =>
                b[1] - a[1]
        )
        .map(
            ([
                category,
                probability,
            ]) => ({
                category,

                confidence:
                    Math.round(
                        probability *
                        1000
                    ) / 1000,
            })
        );
}

/* =========================================================
   MOBILE IMAGE → PIXELS

   Web used:
      canvas.getImageData()

   React Native cannot do that.

   So:
      Expo ImageManipulator
           ↓
      64x64 JPEG
           ↓
      jpeg-js
           ↓
      RGB pixels
========================================================= */

async function extractPixelsFromImage(
    uri: string
): Promise<Pixel[]> {
    const manipulated =
        await ImageManipulator.manipulateAsync(
            uri,

            [
                {
                    resize: {
                        width:
                            SAMPLE_SIZE,

                        height:
                            SAMPLE_SIZE,
                    },
                },
            ],

            {
                compress: 0.8,

                format:
                    ImageManipulator
                        .SaveFormat
                        .JPEG,

                base64: true,
            }
        );

    if (
        !manipulated.base64
    ) {
        throw new Error(
            'Unable to read image pixels.'
        );
    }

    const bytes =
        base64js.toByteArray(
            manipulated.base64
        );

    const decoded =
        jpeg.decode(
            bytes,
            {
                useTArray: true,
            }
        );

    if (
        !decoded?.data
    ) {
        throw new Error(
            'Unable to decode image.'
        );
    }

    const pixels: Pixel[] =
        [];

    /*
     * jpeg-js returns:
     * R G B A R G B A ...
     */
    for (
        let i = 0;
        i <
        decoded.data.length;
        i += 4
    ) {
        pixels.push({
            r:
                decoded.data[
                i
                ],

            g:
                decoded.data[
                i + 1
                ],

            b:
                decoded.data[
                i + 2
                ],
        });
    }

    return pixels;
}

/* =========================================================
   CLASSIFY MOBILE IMAGE
========================================================= */

async function classifyImage(
    uri: string
): Promise<ClassificationResult> {
    const pixels =
        await extractPixelsFromImage(
            uri
        );

    const features =
        collectFeatures(
            pixels
        );

    const ranked =
        classifyFeatures(
            features
        );

    const top =
        ranked[0];

    const confidence =
        top.confidence;

    const winnerSpread =
        confidence -
        (ranked[1]
            ?.confidence ??
            0);

    let verdict:
        | 'low'
        | 'medium'
        | 'high' =
        'low';

    if (
        confidence >= 0.4 &&
        winnerSpread >= 0.12
    ) {
        verdict =
            'medium';
    }

    if (
        confidence >= 0.55 &&
        winnerSpread >= 0.2
    ) {
        verdict =
            'high';
    }

    return {
        category:
            top.category,

        confidence,

        verdict,

        candidates:
            ranked.slice(
                0,
                3
            ),

        features,
    };
}

/* =========================================================
   CREATE LOT SCREEN
========================================================= */

export default function CreateLotScreen() {
    const { t } = useTranslation();
    const [
        step,
        setStep,
    ] = useState(0);

    const [
        collectorId,
        setCollectorId,
    ] =
        useState<
            number | null
        >(null);

    const [
        loadingSession,
        setLoadingSession,
    ] =
        useState(true);

    const [
        photos,
        setPhotos,
    ] =
        useState<
            PhotoItem[]
        >([]);

    const [
        category,
        setCategory,
    ] =
        useState('');

    const [
        subCategory,
        setSubCategory,
    ] =
        useState('');

    const [
        weight,
        setWeight,
    ] =
        useState('');

    const [
        location,
        setLocation,
    ] =
        useState(
            DEFAULT_LOCATION
        );

    const [
        collectionLat,
        setCollectionLat,
    ] =
        useState(
            Number(
                DEFAULT_LAT
            )
        );

    const [
        collectionLng,
        setCollectionLng,
    ] =
        useState(
            Number(
                DEFAULT_LNG
            )
        );

    const [
        gpsHint,
        setGpsHint,
    ] =
        useState('');

    const [
        detectingGps,
        setDetectingGps,
    ] =
        useState(false);

    const [
        description,
        setDescription,
    ] =
        useState('');

    const [
        valuation,
        setValuation,
    ] =
        useState<
            Valuation | null
        >(null);

    const [
        loadingVal,
        setLoadingVal,
    ] =
        useState(false);

    const [
        creating,
        setCreating,
    ] =
        useState(false);

    const [
        error,
        setError,
    ] =
        useState('');

    const [
        photoError,
        setPhotoError,
    ] =
        useState('');

    /* AI classification */

    const [
        classify,
        setClassify,
    ] =
        useState<
            ClassificationResult | null
        >(null);

    const [
        classifying,
        setClassifying,
    ] =
        useState(false);

    const [
        classifyDismissed,
        setClassifyDismissed,
    ] =
        useState(false);

    const [
        aiFeedbackId,
        setAiFeedbackId,
    ] =
        useState<
            number | null
        >(null);

    const [
        scanStep,
        setScanStep,
    ] =
        useState(0);

    const [
        scanProgress,
        setScanProgress,
    ] =
        useState(0);

    const scanningRef =
        useRef(false);

    const catObj =
        useMemo(
            () =>
                MATERIAL_CATEGORIES.find(
                    (item) =>
                        item.id ===
                        category
                ),

            [category]
        );

    function catMeta(
        id: string
    ) {
        return MATERIAL_CATEGORIES.find(
            (item) =>
                item.id === id
        );
    }

    /* =======================================================
       SESSION
    ======================================================= */

    useEffect(() => {
        async function loadSession() {
            try {
                const id =
                    await currentCollectorId();

                const session =
                    await getSession();

                if (!id) {
                    router.replace(
                        '/login/collector'
                    );

                    return;
                }

                setCollectorId(
                    id
                );

                if (
                    session?.operating_location
                ) {
                    setLocation(
                        session.operating_location
                    );
                }

                if (
                    session?.latitude !=
                    null
                ) {
                    setCollectionLat(
                        Number(
                            session.latitude
                        )
                    );
                }

                if (
                    session?.longitude !=
                    null
                ) {
                    setCollectionLng(
                        Number(
                            session.longitude
                        )
                    );
                }
            } finally {
                setLoadingSession(
                    false
                );
            }
        }

        loadSession();
    }, []);

    /* =======================================================
       AUTO CLASSIFY FIRST PHOTO
    ======================================================= */

    useEffect(() => {
        const firstPhoto =
            photos[0];

        if (
            !firstPhoto ||
            category ||
            classifyDismissed ||
            scanningRef.current
        ) {
            return;
        }

        runClassification(
            firstPhoto
        );
    }, [
        photos[0]?.uri,
    ]);

    /* =======================================================
       RUN CLASSIFIER
    ======================================================= */

    async function runClassification(
        photo: PhotoItem
    ) {
        if (
            scanningRef.current
        ) {
            return;
        }

        scanningRef.current =
            true;

        setClassifying(
            true
        );

        setClassify(null);
        setScanStep(0);
        setScanProgress(5);

        let progress = 5;
        let pipelineStep = 0;

        const timer =
            setInterval(
                () => {
                    progress =
                        Math.min(
                            92,
                            progress +
                            8 +
                            Math.random() *
                            13
                        );

                    pipelineStep =
                        Math.min(
                            PIPELINE.length -
                            1,
                            pipelineStep + 1
                        );

                    setScanProgress(
                        progress
                    );

                    setScanStep(
                        pipelineStep
                    );
                },
                280
            );

        try {
            const result =
                await classifyImage(
                    photo.uri
                );

            setScanProgress(
                100
            );

            setClassify(
                result
            );

            /*
             * Same feedback behaviour
             * as your web version.
             */
            try {
                const response =
                    await submitAiFeedback(
                        {
                            collector_id:
                                collectorId ??
                                null,

                            ai_predicted_category:
                                result.category,

                            ai_confidence:
                                result.confidence,

                            ai_verdict:
                                result.verdict,

                            ai_candidates:
                                result.candidates,

                            ai_features:
                                result.features,

                            outcome:
                                'pending',
                        }
                    );

                if (
                    response?.data
                        ?.id
                ) {
                    setAiFeedbackId(
                        response.data.id
                    );
                }
            } catch (
            feedbackError
            ) {
                /*
                 * Classification should still
                 * work even if feedback API fails.
                 */
                console.log(
                    'AI feedback save failed:',
                    feedbackError
                );
            }
        } catch (
        classifyError
        ) {
            console.log(
                'Classification failed:',
                classifyError
            );

            setClassify(
                null
            );
        } finally {
            clearInterval(
                timer
            );

            scanningRef.current =
                false;

            setClassifying(
                false
            );
        }
    }

    /* =======================================================
       APPLY SUGGESTION
    ======================================================= */

    function applySuggestion(
        id: string
    ) {
        setCategory(id);
        setSubCategory('');
        setError('');

        setClassifyDismissed(
            true
        );

        if (
            aiFeedbackId &&
            classify
        ) {
            const outcome =
                id ===
                    classify.category
                    ? 'accepted'
                    : 'corrected';

            updateAiFeedback(
                aiFeedbackId,
                {
                    human_category:
                        id,

                    outcome,
                }
            ).catch(() => { });
        }
    }

    function chooseManualCategory(
        id: string
    ) {
        setCategory(id);
        setSubCategory('');
        setError('');
    }

    /* =======================================================
       CAMERA
    ======================================================= */

    async function takePhoto() {
        setPhotoError('');

        if (
            photos.length >=
            MAX_PHOTOS
        ) {
            setPhotoError(
                `Maximum ${MAX_PHOTOS} photos allowed.`
            );

            return;
        }

        const permission =
            await ImagePicker.requestCameraPermissionsAsync();

        if (
            !permission.granted
        ) {
            Alert.alert(
                'Camera Permission',
                'Camera permission is required to take a photo.'
            );

            return;
        }

        const result =
            await ImagePicker.launchCameraAsync(
                {
                    mediaTypes: [
                        'images',
                    ],

                    allowsEditing:
                        false,

                    quality: 0.7,

                    base64: true,
                }
            );

        if (
            result.canceled
        ) {
            return;
        }

        const asset =
            result.assets[0];

        const newPhoto = {
            uri:
                asset.uri,

            base64:
                asset.base64,

            mimeType:
                asset.mimeType ||
                'image/jpeg',
        };

        setPhotos(
            (previous) => [
                ...previous,
                newPhoto,
            ]
        );

        /*
         * New first image should be
         * classified.
         */
        if (
            photos.length ===
            0
        ) {
            setClassifyDismissed(
                false
            );

            setClassify(
                null
            );
        }
    }

    /* =======================================================
       GALLERY
    ======================================================= */

    async function pickPhotos() {
        setPhotoError('');

        const remaining =
            MAX_PHOTOS -
            photos.length;

        if (
            remaining <= 0
        ) {
            setPhotoError(
                `Maximum ${MAX_PHOTOS} photos allowed.`
            );

            return;
        }

        const permission =
            await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (
            !permission.granted
        ) {
            Alert.alert(
                'Gallery Permission',
                'Photo library permission is required.'
            );

            return;
        }

        const result =
            await ImagePicker.launchImageLibraryAsync(
                {
                    mediaTypes: [
                        'images',
                    ],

                    allowsMultipleSelection:
                        true,

                    selectionLimit:
                        remaining,

                    quality: 0.7,

                    base64: true,
                }
            );

        if (
            result.canceled
        ) {
            return;
        }

        const selected =
            result.assets
                .slice(
                    0,
                    remaining
                )
                .map(
                    (asset) => ({
                        uri:
                            asset.uri,

                        base64:
                            asset.base64,

                        mimeType:
                            asset.mimeType ||
                            'image/jpeg',
                    })
                );

        setPhotos(
            (previous) => [
                ...previous,
                ...selected,
            ]
        );

        if (
            photos.length ===
            0 &&
            selected.length >
            0
        ) {
            setClassifyDismissed(
                false
            );

            setClassify(
                null
            );
        }
    }

    /* =======================================================
       REMOVE PHOTO
    ======================================================= */

    function removePhoto(
        index: number
    ) {
        setPhotos(
            (previous) =>
                previous.filter(
                    (_, i) =>
                        i !== index
                )
        );

        /*
         * First photo controls
         * classification.
         */
        if (
            index === 0
        ) {
            setClassify(
                null
            );

            setAiFeedbackId(
                null
            );

            /*
             * Only auto-classify replacement
             * photo if user hasn't selected
             * a category yet.
             */
            if (!category) {
                setClassifyDismissed(
                    false
                );
            }
        }
    }

    /* =======================================================
       GPS
    ======================================================= */

    async function detectGps() {
        setDetectingGps(
            true
        );

        setGpsHint(
            'Acquiring precise GPS coordinates...'
        );

        try {
            const permission =
                await Location.requestForegroundPermissionsAsync();

            if (
                permission.status !==
                'granted'
            ) {
                setGpsHint(
                    'Location permission denied.'
                );

                return;
            }

            const current =
                await Location.getCurrentPositionAsync(
                    {
                        accuracy:
                            Location
                                .Accuracy
                                .High,
                    }
                );

            const latitude =
                Number(
                    current.coords.latitude.toFixed(
                        6
                    )
                );

            const longitude =
                Number(
                    current.coords.longitude.toFixed(
                        6
                    )
                );

            const gpsLocation =
                `GPS Location (${latitude.toFixed(
                    4
                )}, ${longitude.toFixed(
                    4
                )})`;

            setCollectionLat(
                latitude
            );

            setCollectionLng(
                longitude
            );

            setLocation(
                gpsLocation
            );

            setGpsHint(
                `📍 Coordinates detected: ${latitude.toFixed(
                    4
                )}, ${longitude.toFixed(
                    4
                )}`
            );

            if (
                category &&
                weight &&
                Number(weight) >
                0
            ) {
                await fetchValuation(
                    Number(weight),
                    category,
                    gpsLocation
                );
            }
        } catch {
            setGpsHint(
                'Could not access GPS. Using selected city.'
            );
        } finally {
            setDetectingGps(
                false
            );
        }
    }

    /* =======================================================
       VALUATION
    ======================================================= */

    async function fetchValuation(
        weightValue: number,
        categoryValue =
            category,
        locationValue =
            location
    ) {
        if (
            !categoryValue ||
            !weightValue ||
            weightValue <= 0
        ) {
            return;
        }

        setLoadingVal(
            true
        );

        try {
            const response =
                await getInstantValuation(
                    {
                        category:
                            categoryValue,

                        location:
                            locationValue,

                        weight:
                            weightValue,
                    }
                );

            setValuation(
                response.data
            );
        } catch (
        valuationError
        ) {
            console.log(
                'Valuation error:',
                valuationError
            );

            setValuation({
                benchmark_available:
                    false,
            });
        } finally {
            setLoadingVal(
                false
            );
        }
    }

    function updateWeight(
        value: string
    ) {
        const clean =
            value.replace(
                /[^0-9.]/g,
                ''
            );

        setWeight(
            clean
        );

        setValuation(
            null
        );
    }

    async function incrementWeight(
        amount: number
    ) {
        const current =
            Number(weight) ||
            0;

        const next =
            Math.max(
                0.1,
                current +
                amount
            );

        const rounded =
            Math.round(
                next * 10
            ) / 10;

        setWeight(
            String(rounded)
        );

        if (category) {
            await fetchValuation(
                rounded
            );
        }
    }

    async function selectPreset(
        value: number
    ) {
        setWeight(
            String(value)
        );

        if (category) {
            await fetchValuation(
                value
            );
        }
    }

    /* =======================================================
       STEP 1 → STEP 2
    ======================================================= */

    function goToStep2() {
        if (!category) {
            setError(
                t('createLot.errors.selectCategory')
            );

            return;
        }

        setError('');

        /*
         * Record whether collector
         * accepted/corrected prediction.
         */
        if (
            aiFeedbackId &&
            classify &&
            !classifyDismissed
        ) {
            const outcome =
                category ===
                    classify.category
                    ? 'accepted'
                    : 'corrected';

            updateAiFeedback(
                aiFeedbackId,
                {
                    human_category:
                        category,

                    outcome,
                }
            ).catch(() => { });

            setClassifyDismissed(
                true
            );
        }

        setStep(1);

        if (
            weight &&
            Number(weight) >
            0
        ) {
            fetchValuation(
                Number(weight),
                category,
                location
            );
        }
    }

    /* =======================================================
       STEP 2 → STEP 3
    ======================================================= */

    async function goToStep3() {
        if (
            !weight ||
            Number(weight) <=
            0
        ) {
            setError(
                t('createLot.errors.validWeight')
            );

            return;
        }

        setError('');

        if (!valuation) {
            await fetchValuation(
                Number(weight)
            );
        }

        setStep(2);
    }

    /* =======================================================
       SUBMIT LOT
    ======================================================= */

    async function handleSubmit() {
        if (
            !collectorId
        ) {
            router.replace(
                '/login/collector'
            );

            return;
        }

        setCreating(true);
        setError('');

        try {
            const descriptionParts: string[] =
                [];

            if (
                subCategory
            ) {
                descriptionParts.push(
                    `Sub-category: ${subCategory}`
                );
            }

            if (
                description.trim()
            ) {
                descriptionParts.push(
                    description.trim()
                );
            }

            const imageRefs =
                photos
                    .filter(
                        (photo) =>
                            !!photo.base64
                    )
                    .map(
                        (photo) =>
                            `data:${photo.mimeType ||
                            'image/jpeg'
                            };base64,${photo.base64
                            }`
                    );

            const response =
                await createLot(
                    {
                        collector_id:
                            collectorId ??
                            DEMO_COLLECTOR_ID,

                        category,

                        approx_weight_kg:
                            Number(
                                weight
                            ),

                        location,

                        collection_lat:
                            collectionLat,

                        collection_lng:
                            collectionLng,

                        description:
                            descriptionParts.join(
                                ' | '
                            ) ||
                            undefined,

                        image_refs:
                            imageRefs,

                        ai_feedback_id:
                            aiFeedbackId ||
                            undefined,
                    }
                );

            const lotId =
                response?.data?.lot?.lot_id ??
                response?.data?.lot_id ??
                response?.data?.id;

            /*
             * Attach created lot ID to
             * AI feedback.
             */
            if (
                aiFeedbackId &&
                lotId
            ) {
                const outcome =
                    classify &&
                        category ===
                        classify.category
                        ? 'accepted'
                        : 'corrected';

                updateAiFeedback(
                    aiFeedbackId,
                    {
                        lot_id:
                            lotId,

                        human_category:
                            category,

                        outcome,
                    }
                ).catch(
                    () => { }
                );
            }

            Alert.alert(
                'Lot Created',
                'Your e-waste lot was created successfully.',
                [
                    {
                        text:
                            'Continue',

                        onPress: () => {
                            if (!lotId) {
                                router.replace(
                                    '/collector'
                                );
                                return;
                            }

                            router.replace({
                                pathname:
                                    '/collector/matched-recyclers',

                                params: {
                                    lotId:
                                        String(lotId),

                                    category,

                                    location,

                                    lat:
                                        String(
                                            collectionLat
                                        ),

                                    lng:
                                        String(
                                            collectionLng
                                        ),

                                    weight:
                                        String(weight),

                                    estimatedValue:
                                        valuation?.estimated_value !=
                                            null
                                            ? String(
                                                valuation.estimated_value
                                            )
                                            : '',
                                },
                            });
                        },
                    },
                ]
            );
        } catch (
        err: any
        ) {
            console.log(
                'Create lot error:',
                err
            );

            if (
                err?.status ===
                404 &&
                /collector/i.test(
                    err?.message ||
                    ''
                )
            ) {
                router.replace(
                    '/login/collector'
                );

                return;
            }

            setError(
                err?.message ||
                t('createLot.errors.submitFailed')
            );
        } finally {
            setCreating(
                false
            );
        }
    }

    /* =======================================================
       LOADING
    ======================================================= */

    if (
        loadingSession
    ) {
        return (
            <View
                style={
                    styles.centerScreen
                }
            >
                <ActivityIndicator
                    size="large"
                    color="#16a34a"
                />

                <Text
                    style={
                        styles.loadingText
                    }
                >
                    {t('common.loading')}
                </Text>
            </View>
        );
    }

    /* =======================================================
       UI
    ======================================================= */

    return (
        <KeyboardAvoidingView
            style={
                styles.screen
            }
            behavior={
                Platform.OS ===
                    'ios'
                    ? 'padding'
                    : undefined
            }
        >
            <ScrollView
                contentContainerStyle={
                    styles.container
                }
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={
                    false
                }
            >
                {/* HEADER */}

                <BrandedHeader
                    showBack
                    title={t('createLot.title')}
                    subtitle={t('createLot.subtitle')}
                />

                <Stepper
                    step={step}
                />

                {error ? (
                    <View
                        style={
                            styles.errorBanner
                        }
                    >
                        <Text
                            style={
                                styles.errorText
                            }
                        >
                            ⚠️ {error}
                        </Text>
                    </View>
                ) : null}

                {/* =================================================
            STEP 1
        ================================================= */}

                {step === 0 && (
                    <>
                        {/* PHOTO */}

                        <View
                            style={
                                styles.card
                            }
                        >
                            <Text
                                style={
                                    styles.cardTitle
                                }
                            >
                                {t('createLot.photo.heading')}{' '}
                                <Text
                                    style={
                                        styles.optional
                                    }
                                >
                                    {t('createLot.photo.optional')}
                                </Text>
                            </Text>

                            <Text
                                style={
                                    styles.cardSubtitle
                                }
                            >
                                {t('createLot.photo.subtitle')}
                            </Text>

                            {photoError ? (
                                <View
                                    style={
                                        styles.errorBanner
                                    }
                                >
                                    <Text
                                        style={
                                            styles.errorText
                                        }
                                    >
                                        {photoError}
                                    </Text>
                                </View>
                            ) : null}

                            {photos.length ===
                                0 ? (
                                <View
                                    style={
                                        styles.photoDrop
                                    }
                                >
                                    <Text
                                        style={
                                            styles.photoIcon
                                        }
                                    >
                                        📷
                                    </Text>

                                    <Text
                                        style={
                                            styles.photoTitle
                                        }
                                    >
                                        {t('createLot.photos.addPhoto')}
                                    </Text>

                                    <Text
                                        style={
                                            styles.photoHint
                                        }
                                    >
                                        {t('createLot.classification.analyzing')}
                                    </Text>

                                    <View
                                        style={
                                            styles.photoButtons
                                        }
                                    >
                                        <Pressable
                                            style={
                                                styles.primaryButton
                                            }
                                            onPress={
                                                takePhoto
                                            }
                                        >
                                            <Text
                                                style={
                                                    styles.primaryButtonText
                                                }
                                            >
                                                📸 {t('createLot.photos.camera')}
                                            </Text>
                                        </Pressable>

                                        <Pressable
                                            style={
                                                styles.outlineButton
                                            }
                                            onPress={
                                                pickPhotos
                                            }
                                        >
                                            <Text
                                                style={
                                                    styles.outlineButtonText
                                                }
                                            >
                                                🖼️ {t('createLot.photos.upload')}
                                            </Text>
                                        </Pressable>
                                    </View>
                                </View>
                            ) : (
                                <View
                                    style={
                                        styles.gallery
                                    }
                                >
                                    {photos.map(
                                        (
                                            photo,
                                            index
                                        ) => (
                                            <View
                                                key={
                                                    photo.uri
                                                }
                                                style={
                                                    styles.photoItem
                                                }
                                            >
                                                <Image
                                                    source={{
                                                        uri:
                                                            photo.uri,
                                                    }}
                                                    style={
                                                        styles.photo
                                                    }
                                                />

                                                {index ===
                                                    0 ? (
                                                    <View
                                                        style={
                                                            styles.coverBadge
                                                        }
                                                    >
                                                        <Text
                                                            style={
                                                                styles.coverBadgeText
                                                            }
                                                        >
                                                            {t('createLot.photo.badgeCover')}
                                                        </Text>
                                                    </View>
                                                ) : null}

                                                <Pressable
                                                    style={
                                                        styles.removePhoto
                                                    }
                                                    onPress={() =>
                                                        removePhoto(
                                                            index
                                                        )
                                                    }
                                                >
                                                    <Text
                                                        style={
                                                            styles.removePhotoText
                                                        }
                                                    >
                                                        ×
                                                    </Text>
                                                </Pressable>
                                            </View>
                                        )
                                    )}

                                    {photos.length <
                                        MAX_PHOTOS && (
                                            <View
                                                style={
                                                    styles.addPhotoGroup
                                                }
                                            >
                                                <Pressable
                                                    style={
                                                        styles.addPhoto
                                                    }
                                                    onPress={
                                                        takePhoto
                                                    }
                                                >
                                                    <Text>
                                                        📸 {t('createLot.photos.addPhoto')}
                                                    </Text>
                                                </Pressable>

                                                <Pressable
                                                    style={
                                                        styles.addPhoto
                                                    }
                                                    onPress={
                                                        pickPhotos
                                                    }
                                                >
                                                    <Text>
                                                        🖼️ {t('createLot.photos.upload')}
                                                    </Text>
                                                </Pressable>
                                            </View>
                                        )}
                                </View>
                            )}

                            {/* AI SCANNING */}

                            {classifying && (
                                <View
                                    style={
                                        styles.aiScanning
                                    }
                                >
                                    <View
                                        style={
                                            styles.aiHeader
                                        }
                                    >
                                        <Text
                                            style={
                                                styles.aiSparkle
                                            }
                                        >
                                            ✨
                                        </Text>

                                        <View
                                            style={{
                                                flex: 1,
                                            }}
                                        >
                                            <Text
                                                style={
                                                    styles.aiTitle
                                                }
                                            >
                                                {t('createLot.classification.scanning')}
                                            </Text>

                                            <Text
                                                style={
                                                    styles.aiMeta
                                                }
                                            >
                                                {t(
                                                    `createLot.classification.pipeline.${PIPELINE[scanStep]}`
                                                )}{' '}
                                                (
                                                {Math.round(
                                                    scanProgress
                                                )}
                                                %)
                                            </Text>
                                        </View>

                                        <ActivityIndicator
                                            size="small"
                                            color="#7c3aed"
                                        />
                                    </View>

                                    <View
                                        style={
                                            styles.progressTrack
                                        }
                                    >
                                        <View
                                            style={[
                                                styles.progressFill,

                                                {
                                                    width:
                                                        `${Math.min(
                                                            100,
                                                            scanProgress
                                                        )}%`,
                                                },
                                            ]}
                                        />
                                    </View>
                                </View>
                            )}

                            {/* CLASSIFICATION RESULT */}

                            {!classifying &&
                                classify &&
                                !classifyDismissed && (
                                    <View
                                        style={
                                            styles.aiSuggestion
                                        }
                                    >
                                        <View
                                            style={
                                                styles.aiSuggestionHeader
                                            }
                                        >
                                            <Text
                                                style={
                                                    styles.aiSparkleLarge
                                                }
                                            >
                                                ✨
                                            </Text>

                                            <View
                                                style={{
                                                    flex: 1,
                                                }}
                                            >
                                                <Text
                                                    style={
                                                        styles.aiDetectedSmall
                                                    }
                                                >
                                                    {t('createLot.classification.suggested').toUpperCase()}
                                                </Text>

                                                <View
                                                    style={
                                                        styles.detectedRow
                                                    }
                                                >
                                                    <Text
                                                        style={
                                                            styles.aiDetected
                                                        }
                                                    >
                                                        {
                                                            catMeta(
                                                                classify.category
                                                            )
                                                                ?.icon
                                                        }{' '}
                                                        {t(`materials.${classify.category}`)}
                                                    </Text>

                                                    <ConfidenceBadge
                                                        confidence={
                                                            classify.confidence
                                                        }
                                                        verdict={
                                                            classify.verdict
                                                        }
                                                    />
                                                </View>
                                            </View>
                                        </View>

                                        <Text
                                            style={
                                                styles.aiReason
                                            }
                                        >
                                            {t('createLot.classification.autoSuggest')}
                                        </Text>

                                        {/* TOP 3 */}

                                        <View
                                            style={
                                                styles.candidates
                                            }
                                        >
                                            {classify.candidates.map(
                                                (
                                                    candidate
                                                ) => (
                                                    <View
                                                        key={
                                                            candidate.category
                                                        }
                                                        style={
                                                            styles.candidate
                                                        }
                                                    >
                                                        <Text
                                                            style={
                                                                styles.candidateName
                                                            }
                                                        >
                                                            {t(`materials.${candidate.category}`)}
                                                        </Text>

                                                        <Text
                                                            style={
                                                                styles.candidateConfidence
                                                            }
                                                        >
                                                            {Math.round(
                                                                candidate.confidence *
                                                                100
                                                            )}
                                                            %
                                                        </Text>
                                                    </View>
                                                )
                                            )}
                                        </View>

                                        <View
                                            style={
                                                styles.aiActions
                                            }
                                        >
                                            <Pressable
                                                style={
                                                    styles.useSuggestionButton
                                                }
                                                onPress={() =>
                                                    applySuggestion(
                                                        classify.category
                                                    )
                                                }
                                            >
                                                <Text
                                                    style={
                                                        styles.useSuggestionText
                                                    }
                                                >
                                                    ✓ Use{' '}
                                                    {t(`materials.${classify.category}`)}
                                                </Text>
                                            </Pressable>

                                            <Pressable
                                                style={
                                                    styles.chooseOtherButton
                                                }
                                                onPress={() =>
                                                    setClassifyDismissed(
                                                        true
                                                    )
                                                }
                                            >
                                                <Text
                                                    style={
                                                        styles.chooseOtherText
                                                    }
                                                >
                                                    {t('createLot.classification.chooseOther')}
                                                </Text>
                                            </Pressable>
                                        </View>
                                    </View>
                                )}
                        </View>

                        {/* CATEGORY */}

                        <View
                            style={
                                styles.card
                            }
                        >
                            <Text
                                style={
                                    styles.cardTitle
                                }
                            >
                                {t('createLot.category.heading')}
                            </Text>

                            <Text
                                style={
                                    styles.cardSubtitle
                                }
                            >
                                {t('createLot.category.subtitle')}
                            </Text>

                            <View
                                style={
                                    styles.categoryGrid
                                }
                            >
                                {MATERIAL_CATEGORIES.map(
                                    (cat) => {
                                        const selected =
                                            category ===
                                            cat.id;

                                        return (
                                            <Pressable
                                                key={
                                                    cat.id
                                                }
                                                style={[
                                                    styles.categoryCard,

                                                    selected &&
                                                    styles.categoryCardSelected,
                                                ]}
                                                onPress={() =>
                                                    chooseManualCategory(
                                                        cat.id
                                                    )
                                                }
                                            >
                                                <Text
                                                    style={
                                                        styles.categoryIcon
                                                    }
                                                >
                                                    {cat.icon ||
                                                        '♻️'}
                                                </Text>

                                                <Text
                                                    style={[
                                                        styles.categoryLabel,

                                                        selected &&
                                                        styles.categoryLabelSelected,
                                                    ]}
                                                >
                                                    {t(`materials.${cat.id}`)}
                                                </Text>

                                                {selected ? (
                                                    <View
                                                        style={
                                                            styles.categoryCheck
                                                        }
                                                    >
                                                        <Text
                                                            style={
                                                                styles.categoryCheckText
                                                            }
                                                        >
                                                            ✓
                                                        </Text>
                                                    </View>
                                                ) : null}
                                            </Pressable>
                                        );
                                    }
                                )}
                            </View>

                            {catObj?.sub &&
                                catObj.sub.length >
                                0 ? (
                                <View
                                    style={
                                        styles.subCategoryArea
                                    }
                                >
                                    <Text
                                        style={
                                            styles.inputLabel
                                        }
                                    >
                                        {t('createLot.category.subType')}
                                    </Text>

                                    <View
                                        style={
                                            styles.subCategoryRow
                                        }
                                    >
                                        {catObj.sub.map(
                                            (sub) => {
                                                const selected =
                                                    subCategory ===
                                                    sub;

                                                return (
                                                    <Pressable
                                                        key={
                                                            sub
                                                        }
                                                        style={[
                                                            styles.subCategoryChip,

                                                            selected &&
                                                            styles.subCategoryChipSelected,
                                                        ]}
                                                        onPress={() =>
                                                            setSubCategory(
                                                                selected
                                                                    ? ''
                                                                    : sub
                                                            )
                                                        }
                                                    >
                                                        <Text
                                                            style={[
                                                                styles.subCategoryText,

                                                                selected &&
                                                                styles.subCategoryTextSelected,
                                                            ]}
                                                        >
                                                            {
                                                                sub
                                                            }
                                                        </Text>
                                                    </Pressable>
                                                );
                                            }
                                        )}
                                    </View>
                                </View>
                            ) : null}
                        </View>

                        <View
                            style={
                                styles.stepNav
                            }
                        >
                            <Pressable
                                style={
                                    styles.outlineButton
                                }
                                onPress={() =>
                                    router.back()
                                }
                            >
                                <Text
                                    style={
                                        styles.outlineButtonText
                                    }
                                >
                                    {t('common.cancel')}
                                </Text>
                            </Pressable>

                            <Pressable
                                style={[
                                    styles.primaryButton,

                                    !category &&
                                    styles.disabledButton,
                                ]}
                                disabled={
                                    !category
                                }
                                onPress={
                                    goToStep2
                                }
                            >
                                <Text
                                    style={
                                        styles.primaryButtonText
                                    }
                                >
                                    {t('createLot.actions.continueWeight')}
                                </Text>
                            </Pressable>
                        </View>
                    </>
                )}

                {/* =================================================
            STEP 2
        ================================================= */}

                {step === 1 && (
                    <>
                        <View
                            style={
                                styles.card
                            }
                        >
                            <Text
                                style={
                                    styles.cardTitle
                                }
                            >
                                {t('createLot.weight.heading')}
                            </Text>

                            <Text
                                style={
                                    styles.cardSubtitle
                                }
                            >
                                {t('createLot.weight.subtitle')}
                            </Text>

                            <View
                                style={
                                    styles.weightStepper
                                }
                            >
                                <Pressable
                                    style={
                                        styles.weightButton
                                    }
                                    onPress={() =>
                                        incrementWeight(
                                            -1
                                        )
                                    }
                                >
                                    <Text
                                        style={
                                            styles.weightButtonText
                                        }
                                    >
                                        −1
                                    </Text>
                                </Pressable>

                                <View
                                    style={
                                        styles.weightInputWrap
                                    }
                                >
                                    <TextInput
                                        value={
                                            weight
                                        }
                                        onChangeText={
                                            updateWeight
                                        }
                                        keyboardType="decimal-pad"
                                        placeholder="0.0"
                                        placeholderTextColor="#9ca3af"
                                        style={
                                            styles.weightInput
                                        }
                                    />

                                    <Text
                                        style={
                                            styles.weightUnit
                                        }
                                    >
                                        {t('common.kg')}
                                    </Text>
                                </View>

                                <Pressable
                                    style={
                                        styles.weightButton
                                    }
                                    onPress={() =>
                                        incrementWeight(
                                            1
                                        )
                                    }
                                >
                                    <Text
                                        style={
                                            styles.weightButtonText
                                        }
                                    >
                                        +1
                                    </Text>
                                </Pressable>
                            </View>

                            <View
                                style={
                                    styles.weightPresets
                                }
                            >
                                {[
                                    1,
                                    5,
                                    10,
                                    25,
                                    50,
                                ].map(
                                    (
                                        preset
                                    ) => {
                                        const active =
                                            Number(
                                                weight
                                            ) ===
                                            preset;

                                        return (
                                            <Pressable
                                                key={
                                                    preset
                                                }
                                                style={[
                                                    styles.weightChip,

                                                    active &&
                                                    styles.weightChipSelected,
                                                ]}
                                                onPress={() =>
                                                    selectPreset(
                                                        preset
                                                    )
                                                }
                                            >
                                                <Text
                                                    style={[
                                                        styles.weightChipText,

                                                        active &&
                                                        styles.weightChipTextSelected,
                                                    ]}
                                                >
                                                    {
                                                        preset
                                                    }{' '}
                                                    {t('common.kg')}
                                                </Text>
                                            </Pressable>
                                        );
                                    }
                                )}
                            </View>

                            {/* LOCATION */}

                            <View
                                style={
                                    styles.locationArea
                                }
                            >
                                <View
                                    style={
                                        styles.locationHeader
                                    }
                                >
                                    <Text
                                        style={
                                            styles.inputLabel
                                        }
                                    >
                                        {t('createLot.location.label')}
                                    </Text>

                                    <Pressable
                                        onPress={
                                            detectGps
                                        }
                                        disabled={
                                            detectingGps
                                        }
                                    >
                                        <Text
                                            style={
                                                styles.gpsButton
                                            }
                                        >
                                            {detectingGps
                                                ? 'Locating...'
                                                : '📍 Detect GPS'}
                                        </Text>
                                    </Pressable>
                                </View>

                                <ScrollView
                                    horizontal
                                    showsHorizontalScrollIndicator={
                                        false
                                    }
                                    contentContainerStyle={
                                        styles.locationChips
                                    }
                                >
                                    {LOCATIONS.map(
                                        (
                                            item
                                        ) => {
                                            const active =
                                                location ===
                                                item;

                                            return (
                                                <Pressable
                                                    key={
                                                        item
                                                    }
                                                    style={[
                                                        styles.locationChip,

                                                        active &&
                                                        styles.locationChipActive,
                                                    ]}
                                                    onPress={() => {
                                                        setLocation(
                                                            item
                                                        );

                                                        setGpsHint(
                                                            ''
                                                        );

                                                        if (
                                                            weight &&
                                                            category
                                                        ) {
                                                            fetchValuation(
                                                                Number(
                                                                    weight
                                                                ),
                                                                category,
                                                                item
                                                            );
                                                        }
                                                    }}
                                                >
                                                    <Text
                                                        style={[
                                                            styles.locationChipText,

                                                            active &&
                                                            styles.locationChipTextActive,
                                                        ]}
                                                    >
                                                        {
                                                            item
                                                        }
                                                    </Text>
                                                </Pressable>
                                            );
                                        }
                                    )}
                                </ScrollView>

                                {!LOCATIONS.includes(
                                    location
                                ) ? (
                                    <View
                                        style={
                                            styles.gpsLocationBox
                                        }
                                    >
                                        <Text
                                            style={
                                                styles.gpsLocationText
                                            }
                                        >
                                            {location}
                                        </Text>
                                    </View>
                                ) : null}

                                {gpsHint ? (
                                    <Text
                                        style={
                                            styles.gpsHint
                                        }
                                    >
                                        {gpsHint}
                                    </Text>
                                ) : null}
                            </View>
                        </View>

                        {/* VALUATION */}

                        <View
                            style={[
                                styles.card,
                                styles.valuationCard,
                            ]}
                        >
                            <View
                                style={
                                    styles.valuationHeader
                                }
                            >
                                <View
                                    style={{
                                        flex: 1,
                                    }}
                                >
                                    <Text
                                        style={
                                            styles.valuationKicker
                                        }
                                    >
                                        LIVE MARKET
                                        BENCHMARK
                                    </Text>

                                    <Text
                                        style={
                                            styles.valuationTitle
                                        }
                                    >
                                        {catObj?.label ||
                                            category}{' '}
                                        · {location}
                                    </Text>
                                </View>

                                {loadingVal ? (
                                    <ActivityIndicator
                                        color="#16a34a"
                                    />
                                ) : null}
                            </View>

                            {!weight ? (
                                <Text
                                    style={
                                        styles.valuationHint
                                    }
                                >
                                    Enter a weight
                                    to see the
                                    estimated
                                    market value.
                                </Text>
                            ) : valuation
                                ?.benchmark_available ===
                                false ? (
                                <View
                                    style={
                                        styles.valuationUnavailable
                                    }
                                >
                                    <Text
                                        style={
                                            styles.valuationUnavailableIcon
                                        }
                                    >
                                        📊
                                    </Text>

                                    <Text
                                        style={
                                            styles.valuationUnavailableTitle
                                        }
                                    >
                                        Market
                                        benchmark
                                        unavailable
                                    </Text>

                                    <Text
                                        style={
                                            styles.valuationHint
                                        }
                                    >
                                        Recycler
                                        quotes will
                                        establish the
                                        market
                                        reference.
                                    </Text>
                                </View>
                            ) : valuation
                                ?.estimated_value !=
                                null ? (
                                <>
                                    <View
                                        style={
                                            styles.breakdown
                                        }
                                    >
                                        <View
                                            style={
                                                styles.breakdownRow
                                            }
                                        >
                                            <Text
                                                style={
                                                    styles.breakdownLabel
                                                }
                                            >
                                                Estimated
                                                Weight
                                            </Text>

                                            <Text
                                                style={
                                                    styles.breakdownValue
                                                }
                                            >
                                                {weight} kg
                                            </Text>
                                        </View>

                                        <View
                                            style={
                                                styles.breakdownRow
                                            }
                                        >
                                            <Text
                                                style={
                                                    styles.breakdownLabel
                                                }
                                            >
                                                {t('createLot.valuation.unitPrice')}
                                            </Text>

                                            <Text
                                                style={
                                                    styles.marketRate
                                                }
                                            >
                                                {fmtRupees(
                                                    valuation.market_benchmark ??
                                                    valuation.unit_price
                                                )}{' '}
                                                / kg
                                            </Text>
                                        </View>
                                    </View>

                                    <Text
                                        style={
                                            styles.estimatedLabel
                                        }
                                    >
                                        ESTIMATED VALUE
                                    </Text>

                                    <Text
                                        style={
                                            styles.estimatedAmount
                                        }
                                    >
                                        {fmtRupees(
                                            valuation.estimated_value
                                        )}
                                    </Text>

                                    {valuation.market_range_low !=
                                        null &&
                                        valuation.market_range_high !=
                                        null ? (
                                        <Text
                                            style={
                                                styles.marketRange
                                            }
                                        >
                                            Market
                                            range:{' '}
                                            {fmtRupees(
                                                valuation.market_range_low
                                            )}
                                            –
                                            {fmtRupees(
                                                valuation.market_range_high
                                            )}
                                            /kg
                                        </Text>
                                    ) : null}

                                    <Text
                                        style={
                                            styles.valuationInfo
                                        }
                                    >
                                        ℹ Final value
                                        depends on
                                        actual physical
                                        weight and
                                        accepted
                                        recycler quote.
                                    </Text>
                                </>
                            ) : (
                                <Pressable
                                    style={
                                        styles.valuationButton
                                    }
                                    onPress={() =>
                                        fetchValuation(
                                            Number(
                                                weight
                                            )
                                        )
                                    }
                                >
                                    <Text
                                        style={
                                            styles.valuationButtonText
                                        }
                                    >
                                        Check Market
                                        Value
                                    </Text>
                                </Pressable>
                            )}
                        </View>

                        <View
                            style={
                                styles.stepNav
                            }
                        >
                            <Pressable
                                style={
                                    styles.outlineButton
                                }
                                onPress={() =>
                                    setStep(0)
                                }
                            >
                                <Text
                                    style={
                                        styles.outlineButtonText
                                    }
                                >
                                    {t('common.back')}
                                </Text>
                            </Pressable>

                            <Pressable
                                style={[
                                    styles.primaryButton,

                                    (!weight ||
                                        Number(
                                            weight
                                        ) <= 0) &&
                                    styles.disabledButton,
                                ]}
                                disabled={
                                    !weight ||
                                    Number(
                                        weight
                                    ) <= 0
                                }
                                onPress={
                                    goToStep3
                                }
                            >
                                <Text
                                    style={
                                        styles.primaryButtonText
                                    }
                                >
                                    {t('createLot.actions.reviewLot')}
                                </Text>
                            </Pressable>
                        </View>
                    </>
                )}

                {/* =================================================
            STEP 3
        ================================================= */}

                {step === 2 && (
                    <>
                        <View
                            style={
                                styles.card
                            }
                        >
                            <Text
                                style={
                                    styles.cardTitle
                                }
                            >
                                {t('createLot.review.heading')}
                            </Text>

                            <ReviewRow
                                label={t('createLot.review.material')}
                                value={`${catObj?.icon ||
                                    '♻️'
                                    } ${t(`materials.${category}`)}${subCategory
                                        ? ` (${subCategory})`
                                        : ''
                                    }`}
                            />

                            <ReviewRow
                                label={t('createLot.review.weight')}
                                value={`${weight} kg`}
                            />

                            <ReviewRow
                                label={t('createLot.review.marketRange')}
                                value={
                                    valuation?.market_benchmark
                                        ? `${fmtRupees(
                                            valuation.market_benchmark
                                        )} / kg`
                                        : 'Market discovery'
                                }
                            />

                            <View
                                style={
                                    styles.highlightReview
                                }
                            >
                                <Text
                                    style={
                                        styles.reviewLabel
                                    }
                                >
                                    Estimated
                                    Value
                                </Text>

                                <Text
                                    style={
                                        styles.reviewBigValue
                                    }
                                >
                                    {valuation?.estimated_value
                                        ? fmtRupees(
                                            valuation.estimated_value
                                        )
                                        : 'Awaiting quotes'}
                                </Text>

                                <Text
                                    style={
                                        styles.reviewHint
                                    }
                                >
                                    Based on
                                    current{' '}
                                    {location}{' '}
                                    benchmark
                                </Text>
                            </View>

                            <View
                                style={
                                    styles.infoBanner
                                }
                            >
                                <Text
                                    style={
                                        styles.infoText
                                    }
                                >
                                    ℹ Final value
                                    depends on
                                    actual physical
                                    scale weight and
                                    accepted recycler
                                    quote.
                                </Text>
                            </View>

                            <Text
                                style={[
                                    styles.inputLabel,
                                    {
                                        marginTop:
                                            20,
                                    },
                                ]}
                            >
                                {t('createLot.notes.label')}{' '}
                                <Text
                                    style={
                                        styles.optional
                                    }
                                >
                                    {t('createLot.photo.optional')}
                                </Text>
                            </Text>

                            <TextInput
                                value={
                                    description
                                }
                                onChangeText={
                                    setDescription
                                }
                                placeholder={t('createLot.notes.placeholder')}
                                placeholderTextColor="#9ca3af"
                                multiline
                                style={
                                    styles.notesInput
                                }
                            />
                        </View>

                        <View
                            style={
                                styles.stepNav
                            }
                        >
                            <Pressable
                                style={
                                    styles.outlineButton
                                }
                                disabled={
                                    creating
                                }
                                onPress={() =>
                                    setStep(1)
                                }
                            >
                                <Text
                                    style={
                                        styles.outlineButtonText
                                    }
                                >
                                    {t('common.back')}
                                </Text>
                            </Pressable>

                            <Pressable
                                style={[
                                    styles.primaryButton,

                                    creating &&
                                    styles.disabledButton,
                                ]}
                                disabled={
                                    creating
                                }
                                onPress={
                                    handleSubmit
                                }
                            >
                                {creating ? (
                                    <View
                                        style={
                                            styles.loadingRow
                                        }
                                    >
                                        <ActivityIndicator
                                            size="small"
                                            color="#ffffff"
                                        />

                                        <Text
                                            style={
                                                styles.primaryButtonText
                                            }
                                        >
                                            {t('createLot.actions.creating')}
                                        </Text>
                                    </View>
                                ) : (
                                    <Text
                                        style={
                                            styles.primaryButtonText
                                        }
                                    >
                                        {t('createLot.buttons.submitLot')}
                                    </Text>
                                )}
                            </Pressable>
                        </View>
                    </>
                )}

                <View
                    style={{
                        height: 50,
                    }}
                />
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

/* =========================================================
   CONFIDENCE BADGE
========================================================= */

function ConfidenceBadge({
    confidence,
    verdict,
}: {
    confidence: number;
    verdict: string;
}) {
    const { t } = useTranslation();
    return (
        <View
            style={[
                styles.confidenceBadge,

                verdict ===
                'high' &&
                styles.confidenceHigh,

                verdict ===
                'medium' &&
                styles.confidenceMedium,

                verdict ===
                'low' &&
                styles.confidenceLow,
            ]}
        >
            <Text
                style={
                    styles.confidenceText
                }
            >
                {Math.round(
                    confidence * 100
                )}
                % {t('createLot.classification.match')}
            </Text>
        </View>
    );
}

/* =========================================================
   STEPPER
========================================================= */

function Stepper({
    step,
}: {
    step: number;
}) {
    const { t } = useTranslation();
    const labels = [
        t('createLot.steps.photoCategory'),
        t('createLot.steps.weightValue'),
        t('createLot.steps.reviewSubmit'),
    ];

    return (
        <View
            style={
                styles.stepper
            }
        >
            {labels.map(
                (
                    label,
                    index
                ) => (
                    <View
                        style={
                            styles.stepWrapper
                        }
                        key={
                            label
                        }
                    >
                        <View
                            style={
                                styles.stepItem
                            }
                        >
                            <View
                                style={[
                                    styles.stepDot,

                                    index ===
                                    step &&
                                    styles.stepDotActive,

                                    index <
                                    step &&
                                    styles.stepDotDone,
                                ]}
                            >
                                <Text
                                    style={[
                                        styles.stepDotText,

                                        index <=
                                        step &&
                                        styles.stepDotTextActive,
                                    ]}
                                >
                                    {index <
                                        step
                                        ? '✓'
                                        : index +
                                        1}
                                </Text>
                            </View>

                            <Text
                                style={[
                                    styles.stepLabel,

                                    index ===
                                    step &&
                                    styles.stepLabelActive,
                                ]}
                            >
                                {label}
                            </Text>
                        </View>

                        {index <
                            labels.length -
                            1 && (
                                <View
                                    style={[
                                        styles.stepLine,

                                        index <
                                        step &&
                                        styles.stepLineDone,
                                    ]}
                                />
                            )}
                    </View>
                )
            )}
        </View>
    );
}

/* =========================================================
   REVIEW ROW
========================================================= */

function ReviewRow({
    label,
    value,
}: {
    label: string;
    value: string;
}) {
    return (
        <View
            style={
                styles.reviewRow
            }
        >
            <Text
                style={
                    styles.reviewLabel
                }
            >
                {label}
            </Text>

            <Text
                style={
                    styles.reviewValue
                }
            >
                {value}
            </Text>
        </View>
    );
}

function fmtRupees(
    value?:
        | number
        | null
) {
    if (
        value == null
    ) {
        return '—';
    }

    return `₹${Number(
        value
    ).toLocaleString(
        'en-IN',
        {
            maximumFractionDigits:
                0,
        }
    )}`;
}

/* =========================================================
   STYLES
========================================================= */

const styles =
    StyleSheet.create({
        screen: {
            flex: 1,
            backgroundColor:
                '#f8fafc',
        },

        centerScreen: {
            flex: 1,
            alignItems:
                'center',
            justifyContent:
                'center',
            backgroundColor:
                '#f8fafc',
        },

        container: {
            padding: 18,
        },

        loadingText: {
            marginTop: 10,
            color:
                '#6b7280',
        },

        header: {
            marginBottom: 22,
        },

        backLink: {
            fontSize: 14,
            color:
                '#16a34a',
            fontWeight:
                '700',
            marginBottom: 14,
        },

        title: {
            fontSize: 29,
            color:
                '#111827',
            fontWeight:
                '800',
        },

        subtitle: {
            color:
                '#6b7280',
            fontSize: 14,
            marginTop: 6,
        },

        /* STEPPER */

        stepper: {
            flexDirection:
                'row',
            alignItems:
                'center',
            marginBottom: 24,
        },

        stepWrapper: {
            flex: 1,
            flexDirection:
                'row',
            alignItems:
                'center',
        },

        stepItem: {
            alignItems:
                'center',
        },

        stepDot: {
            width: 30,
            height: 30,
            borderRadius: 15,
            backgroundColor:
                '#ffffff',
            borderWidth: 2,
            borderColor:
                '#d1d5db',
            justifyContent:
                'center',
            alignItems:
                'center',
        },

        stepDotActive: {
            backgroundColor:
                '#16a34a',
            borderColor:
                '#16a34a',
        },

        stepDotDone: {
            backgroundColor:
                '#f59e0b',
            borderColor:
                '#f59e0b',
        },

        stepDotText: {
            color:
                '#6b7280',
            fontWeight:
                '700',
        },

        stepDotTextActive: {
            color:
                '#ffffff',
        },

        stepLabel: {
            marginTop: 5,
            fontSize: 10,
            color:
                '#9ca3af',
        },

        stepLabelActive: {
            color:
                '#16a34a',
            fontWeight:
                '700',
        },

        stepLine: {
            flex: 1,
            height: 2,
            backgroundColor:
                '#e5e7eb',
            marginHorizontal:
                7,
        },

        stepLineDone: {
            backgroundColor:
                '#16a34a',
        },

        /* CARD */

        card: {
            backgroundColor:
                '#ffffff',
            borderWidth: 1,
            borderColor:
                '#e5e7eb',
            borderRadius: 17,
            padding: 18,
            marginBottom: 16,

            elevation: 2,

            shadowColor:
                '#000',
            shadowOpacity:
                0.04,
            shadowRadius: 8,
            shadowOffset: {
                width: 0,
                height: 3,
            },
        },

        cardTitle: {
            fontSize: 18,
            fontWeight:
                '800',
            color:
                '#111827',
        },

        cardSubtitle: {
            marginTop: 5,
            color:
                '#6b7280',
            fontSize: 13,
            marginBottom: 16,
        },

        optional: {
            color:
                '#9ca3af',
            fontSize: 12,
            fontWeight:
                '400',
        },

        errorBanner: {
            backgroundColor:
                '#fef2f2',
            borderColor:
                '#fca5a5',
            borderWidth: 1.5,
            padding: 12,
            borderRadius: 10,
            marginBottom: 14,
        },

        errorText: {
            color:
                '#b91c1c',
            fontSize: 13,
        },

        /* PHOTO */

        photoDrop: {
            minHeight: 190,
            borderWidth: 2,
            borderStyle:
                'dashed',
            borderColor:
                '#d1d5db',
            borderRadius: 14,
            alignItems:
                'center',
            justifyContent:
                'center',
            padding: 20,
            backgroundColor:
                '#f9fafb',
        },

        photoIcon: {
            fontSize: 40,
        },

        photoTitle: {
            marginTop: 8,
            fontSize: 15,
            fontWeight:
                '700',
            color:
                '#374151',
        },

        photoHint: {
            marginTop: 5,
            color:
                '#9ca3af',
            fontSize: 11,
            textAlign:
                'center',
        },

        photoButtons: {
            flexDirection:
                'row',
            marginTop: 17,
            gap: 10,
        },

        gallery: {
            flexDirection:
                'row',
            flexWrap:
                'wrap',
            gap: 10,
        },

        photoItem: {
            width: '47%',
            height: 130,
            position:
                'relative',
        },

        photo: {
            width: '100%',
            height: '100%',
            borderRadius: 12,
        },

        coverBadge: {
            position:
                'absolute',
            left: 6,
            bottom: 6,
            backgroundColor:
                '#16a34a',
            borderRadius: 8,
            paddingHorizontal:
                7,
            paddingVertical:
                3,
        },

        coverBadgeText: {
            color:
                '#ffffff',
            fontSize: 9,
            fontWeight:
                '700',
        },

        removePhoto: {
            position:
                'absolute',
            right: 6,
            top: 6,
            backgroundColor:
                '#111827',
            width: 26,
            height: 26,
            borderRadius: 13,
            alignItems:
                'center',
            justifyContent:
                'center',
        },

        removePhotoText: {
            color:
                '#ffffff',
            fontSize: 18,
            lineHeight: 19,
        },

        addPhotoGroup: {
            width: '47%',
            gap: 8,
        },

        addPhoto: {
            flex: 1,
            minHeight: 55,
            borderWidth: 1.5,
            borderStyle:
                'dashed',
            borderColor:
                '#d1d5db',
            borderRadius: 10,
            alignItems:
                'center',
            justifyContent:
                'center',
        },

        /* AI CLASSIFIER */

        aiScanning: {
            marginTop: 15,
            padding: 14,
            borderRadius: 13,
            backgroundColor:
                '#f5f3ff',
            borderWidth: 1,
            borderColor:
                '#ddd6fe',
        },

        aiHeader: {
            flexDirection:
                'row',
            alignItems:
                'center',
            gap: 10,
        },

        aiSparkle: {
            fontSize: 20,
        },

        aiTitle: {
            color:
                '#5b21b6',
            fontWeight:
                '800',
            fontSize: 13,
        },

        aiMeta: {
            marginTop: 2,
            color:
                '#7c3aed',
            fontSize: 10,
        },

        progressTrack: {
            height: 6,
            borderRadius: 3,
            backgroundColor:
                '#ede9fe',
            marginTop: 12,
            overflow:
                'hidden',
        },

        progressFill: {
            height: '100%',
            backgroundColor:
                '#7c3aed',
            borderRadius: 3,
        },

        aiSuggestion: {
            marginTop: 15,
            backgroundColor:
                '#f5f3ff',
            borderWidth: 1.5,
            borderColor:
                '#c4b5fd',
            borderRadius: 14,
            padding: 15,
        },

        aiSuggestionHeader: {
            flexDirection:
                'row',
            gap: 10,
            alignItems:
                'flex-start',
        },

        aiSparkleLarge: {
            fontSize: 25,
        },

        aiDetectedSmall: {
            fontSize: 9,
            color:
                '#7c3aed',
            letterSpacing: 0.8,
            fontWeight:
                '800',
        },

        detectedRow: {
            marginTop: 3,
            flexDirection:
                'row',
            flexWrap:
                'wrap',
            gap: 7,
            alignItems:
                'center',
        },

        aiDetected: {
            color:
                '#4c1d95',
            fontWeight:
                '900',
            fontSize: 18,
        },

        confidenceBadge: {
            borderRadius: 20,
            paddingHorizontal:
                8,
            paddingVertical:
                4,
        },

        confidenceHigh: {
            backgroundColor:
                '#dcfce7',
        },

        confidenceMedium: {
            backgroundColor:
                '#fef3c7',
        },

        confidenceLow: {
            backgroundColor:
                '#f3f4f6',
        },

        confidenceText: {
            fontSize: 9,
            color:
                '#374151',
            fontWeight:
                '700',
        },

        aiReason: {
            color:
                '#6b7280',
            fontSize: 11,
            lineHeight: 16,
            marginTop: 10,
        },

        candidates: {
            marginTop: 12,
            gap: 6,
        },

        candidate: {
            flexDirection:
                'row',
            justifyContent:
                'space-between',
            backgroundColor:
                '#ffffff',
            paddingHorizontal:
                10,
            paddingVertical:
                7,
            borderRadius: 8,
        },

        candidateName: {
            color:
                '#374151',
            fontSize: 10,
            fontWeight:
                '600',
        },

        candidateConfidence: {
            color:
                '#7c3aed',
            fontSize: 10,
            fontWeight:
                '800',
        },

        aiActions: {
            flexDirection:
                'row',
            gap: 8,
            marginTop: 13,
        },

        useSuggestionButton: {
            flex: 1,
            backgroundColor:
                '#16a34a',
            borderRadius: 9,
            paddingVertical:
                10,
            alignItems:
                'center',
        },

        useSuggestionText: {
            color:
                '#ffffff',
            fontWeight:
                '800',
            fontSize: 11,
        },

        chooseOtherButton: {
            borderWidth: 1,
            borderColor:
                '#d1d5db',
            backgroundColor:
                '#ffffff',
            borderRadius: 9,
            paddingVertical:
                10,
            paddingHorizontal:
                12,
            alignItems:
                'center',
        },

        chooseOtherText: {
            color:
                '#6b7280',
            fontWeight:
                '700',
            fontSize: 11,
        },

        /* CATEGORY */

        categoryGrid: {
            flexDirection:
                'row',
            flexWrap:
                'wrap',
            gap: 9,
        },

        categoryCard: {
            width: '31%',
            minHeight: 92,
            borderWidth: 2,
            borderColor:
                '#e5e7eb',
            borderRadius: 13,
            alignItems:
                'center',
            justifyContent:
                'center',
            padding: 8,
            position:
                'relative',
        },

        categoryCardSelected: {
            borderColor:
                '#16a34a',
            backgroundColor:
                '#f0fdf4',
        },

        categoryIcon: {
            fontSize: 25,
            marginBottom: 5,
        },

        categoryLabel: {
            color:
                '#374151',
            fontSize: 11,
            textAlign:
                'center',
            fontWeight:
                '600',
        },

        categoryLabelSelected: {
            color:
                '#15803d',
        },

        categoryCheck: {
            position:
                'absolute',
            right: 5,
            top: 5,
            width: 18,
            height: 18,
            borderRadius: 9,
            backgroundColor:
                '#16a34a',
            justifyContent:
                'center',
            alignItems:
                'center',
        },

        categoryCheckText: {
            color:
                '#ffffff',
            fontSize: 10,
            fontWeight:
                '800',
        },

        subCategoryArea: {
            marginTop: 20,
        },

        inputLabel: {
            color:
                '#374151',
            fontSize: 13,
            fontWeight:
                '700',
        },

        subCategoryRow: {
            flexDirection:
                'row',
            flexWrap:
                'wrap',
            gap: 7,
            marginTop: 9,
        },

        subCategoryChip: {
            borderWidth: 1,
            borderColor:
                '#d1d5db',
            borderRadius: 20,
            paddingVertical:
                7,
            paddingHorizontal:
                11,
        },

        subCategoryChipSelected: {
            backgroundColor:
                '#16a34a',
            borderColor:
                '#16a34a',
        },

        subCategoryText: {
            color:
                '#4b5563',
            fontSize: 11,
        },

        subCategoryTextSelected: {
            color:
                '#ffffff',
        },

        /* BUTTONS */

        stepNav: {
            flexDirection:
                'row',
            justifyContent:
                'space-between',
            alignItems:
                'center',
            marginTop: 5,
            marginBottom: 12,
        },

        primaryButton: {
            backgroundColor:
                '#16a34a',
            paddingHorizontal:
                18,
            paddingVertical:
                13,
            borderRadius: 10,
            minWidth: 110,
            alignItems:
                'center',
        },

        primaryButtonText: {
            color:
                '#ffffff',
            fontSize: 13,
            fontWeight:
                '700',
        },

        outlineButton: {
            borderWidth: 1.5,
            borderColor:
                '#d1d5db',
            backgroundColor:
                '#ffffff',
            paddingHorizontal:
                18,
            paddingVertical:
                12,
            borderRadius: 10,
            alignItems:
                'center',
        },

        outlineButtonText: {
            color:
                '#374151',
            fontSize: 13,
            fontWeight:
                '700',
        },

        disabledButton: {
            opacity: 0.45,
        },

        loadingRow: {
            flexDirection:
                'row',
            alignItems:
                'center',
            gap: 7,
        },

        /* WEIGHT */

        weightStepper: {
            flexDirection:
                'row',
            alignItems:
                'center',
            gap: 8,
        },

        weightButton: {
            width: 52,
            height: 62,
            borderWidth: 1.5,
            borderColor:
                '#d1d5db',
            backgroundColor:
                '#ffffff',
            borderRadius: 12,
            justifyContent:
                'center',
            alignItems:
                'center',
        },

        weightButtonText: {
            color:
                '#16a34a',
            fontSize: 18,
            fontWeight:
                '800',
        },

        weightInputWrap: {
            flex: 1,
            position:
                'relative',
        },

        weightInput: {
            height: 62,
            borderWidth: 2,
            borderColor:
                '#16a34a',
            borderRadius: 12,
            backgroundColor:
                '#ffffff',
            fontSize: 26,
            fontWeight:
                '800',
            color:
                '#16a34a',
            textAlign:
                'center',
            paddingRight: 35,
        },

        weightUnit: {
            position:
                'absolute',
            right: 12,
            top: 20,
            color:
                '#6b7280',
            fontWeight:
                '700',
        },

        weightPresets: {
            flexDirection:
                'row',
            flexWrap:
                'wrap',
            gap: 7,
            marginTop: 15,
        },

        weightChip: {
            borderWidth: 1,
            borderColor:
                '#d1d5db',
            borderRadius: 20,
            paddingVertical:
                7,
            paddingHorizontal:
                12,
        },

        weightChipSelected: {
            backgroundColor:
                '#16a34a',
            borderColor:
                '#16a34a',
        },

        weightChipText: {
            color:
                '#4b5563',
            fontSize: 11,
            fontWeight:
                '600',
        },

        weightChipTextSelected: {
            color:
                '#ffffff',
        },

        /* LOCATION */

        locationArea: {
            marginTop: 22,
        },

        locationHeader: {
            flexDirection:
                'row',
            alignItems:
                'center',
            justifyContent:
                'space-between',
        },

        gpsButton: {
            color:
                '#16a34a',
            fontWeight:
                '700',
            fontSize: 12,
        },

        locationChips: {
            gap: 7,
            paddingTop: 11,
            paddingBottom: 4,
        },

        locationChip: {
            borderWidth: 1,
            borderColor:
                '#d1d5db',
            borderRadius: 18,
            paddingVertical:
                7,
            paddingHorizontal:
                12,
            backgroundColor:
                '#ffffff',
        },

        locationChipActive: {
            borderColor:
                '#16a34a',
            backgroundColor:
                '#f0fdf4',
        },

        locationChipText: {
            color:
                '#4b5563',
            fontSize: 11,
        },

        locationChipTextActive: {
            color:
                '#15803d',
            fontWeight:
                '700',
        },

        gpsHint: {
            marginTop: 8,
            color:
                '#15803d',
            fontSize: 11,
        },

        gpsLocationBox: {
            marginTop: 10,
            backgroundColor:
                '#f0fdf4',
            padding: 10,
            borderRadius: 9,
        },

        gpsLocationText: {
            color:
                '#15803d',
            fontSize: 11,
        },

        /* VALUATION */

        valuationCard: {
            borderWidth: 1.5,
            borderColor:
                '#d1fae5',
        },

        valuationHeader: {
            flexDirection:
                'row',
            alignItems:
                'center',
        },

        valuationKicker: {
            color:
                '#16a34a',
            fontSize: 9,
            fontWeight:
                '800',
            letterSpacing: 1,
        },

        valuationTitle: {
            color:
                '#111827',
            fontSize: 16,
            fontWeight:
                '800',
            marginTop: 4,
        },

        valuationHint: {
            color:
                '#6b7280',
            fontSize: 12,
            lineHeight: 18,
            marginTop: 20,
            textAlign:
                'center',
        },

        valuationUnavailable: {
            alignItems:
                'center',
            paddingVertical:
                20,
        },

        valuationUnavailableIcon: {
            fontSize: 28,
        },

        valuationUnavailableTitle: {
            fontSize: 14,
            fontWeight:
                '700',
            color:
                '#374151',
            marginTop: 8,
        },

        valuationButton: {
            marginTop: 20,
            backgroundColor:
                '#f0fdf4',
            borderRadius: 10,
            padding: 12,
            alignItems:
                'center',
        },

        valuationButtonText: {
            color:
                '#15803d',
            fontWeight:
                '700',
        },

        breakdown: {
            backgroundColor:
                '#f8fafc',
            padding: 13,
            borderRadius: 10,
            marginTop: 18,
        },

        breakdownRow: {
            flexDirection:
                'row',
            justifyContent:
                'space-between',
            marginVertical: 4,
            gap: 15,
        },

        breakdownLabel: {
            color:
                '#6b7280',
            fontSize: 11,
            flex: 1,
        },

        breakdownValue: {
            color:
                '#111827',
            fontSize: 12,
            fontWeight:
                '700',
        },

        marketRate: {
            color:
                '#16a34a',
            fontSize: 12,
            fontWeight:
                '800',
        },

        estimatedLabel: {
            marginTop: 18,
            color:
                '#9ca3af',
            fontSize: 10,
            letterSpacing: 0.8,
        },

        estimatedAmount: {
            color:
                '#f59e0b',
            fontSize: 31,
            fontWeight:
                '900',
            marginTop: 3,
        },

        marketRange: {
            color:
                '#6b7280',
            fontSize: 11,
            marginTop: 5,
        },

        valuationInfo: {
            color:
                '#6b7280',
            fontSize: 10,
            lineHeight: 15,
            marginTop: 15,
        },

        /* REVIEW */

        reviewRow: {
            flexDirection:
                'row',
            justifyContent:
                'space-between',
            gap: 15,
            paddingVertical:
                15,
            borderBottomWidth:
                1,
            borderBottomColor:
                '#e5e7eb',
        },

        reviewLabel: {
            color:
                '#6b7280',
            fontSize: 12,
            flex: 1,
        },

        reviewValue: {
            color:
                '#111827',
            fontSize: 13,
            fontWeight:
                '700',
            textAlign:
                'right',
            flex: 1.3,
        },

        highlightReview: {
            backgroundColor:
                '#f0fdf4',
            borderRadius: 12,
            padding: 15,
            marginTop: 14,
        },

        reviewBigValue: {
            color:
                '#16a34a',
            fontSize: 26,
            fontWeight:
                '900',
            marginTop: 4,
        },

        reviewHint: {
            color:
                '#6b7280',
            fontSize: 10,
            marginTop: 4,
        },

        infoBanner: {
            backgroundColor:
                '#eff6ff',
            borderRadius: 10,
            padding: 11,
            marginTop: 15,
        },

        infoText: {
            color:
                '#475569',
            fontSize: 10,
            lineHeight: 15,
        },

        notesInput: {
            marginTop: 8,
            minHeight: 90,
            borderWidth: 1,
            borderColor:
                '#d1d5db',
            borderRadius: 10,
            padding: 12,
            color:
                '#111827',
            textAlignVertical:
                'top',
        },
    });