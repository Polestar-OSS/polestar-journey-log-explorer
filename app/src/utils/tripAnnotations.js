// Trip annotations storage using localStorage
const STORAGE_KEY = 'polestar-trip-annotations';

export const getTripAnnotations = () => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored ? JSON.parse(stored) : {};
    } catch (error) {
        console.error('Error reading trip annotations:', error);
        return {};
    }
};

export const saveTripAnnotations = (annotations) => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(annotations));
    } catch (error) {
        console.error('Error saving trip annotations:', error);
    }
};

export const getTripAnnotation = (tripId) => {
    const annotations = getTripAnnotations();
    return annotations[tripId] || { notes: '', tags: [] };
};

export const saveTripAnnotation = (tripId, annotation) => {
    const annotations = getTripAnnotations();
    annotations[tripId] = annotation;
    saveTripAnnotations(annotations);
};

export const deleteTripAnnotation = (tripId) => {
    const annotations = getTripAnnotations();
    delete annotations[tripId];
    saveTripAnnotations(annotations);
};

// Generate unique trip ID based on trip data
export const generateTripId = (trip) => {
    return `${trip.startDate}-${trip.startOdometer}-${trip.endOdometer}`;
};

// Get all unique tags from all annotations
export const getAllTags = () => {
    const annotations = getTripAnnotations();
    const allTags = new Set();
    Object.values(annotations).forEach(annotation => {
        if (annotation.tags) {
            annotation.tags.forEach(tag => allTags.add(tag));
        }
    });
    return Array.from(allTags).sort();
};
