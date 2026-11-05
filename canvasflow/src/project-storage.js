/**
 * Small, testable local-storage boundary for CanvasFlow project files.
 * A valid older save remains recoverable when a newer key is corrupt, and an
 * optional compatibility-copy failure never turns a successful primary save
 * into a false failure.
 */
export function loadFirstValidProject(storage, keys, normalize) {
  const errors = [];
  for (const key of keys) {
    let serialized;
    try {
      serialized = storage.getItem(key);
    } catch (error) {
      return { project: null, key: null, errors: [...errors, { key, error }], storageUnavailable: true };
    }
    if (!serialized) continue;
    try {
      return { project: normalize(JSON.parse(serialized)), key, errors, storageUnavailable: false };
    } catch (error) {
      errors.push({ key, error });
    }
  }
  return { project: null, key: null, errors, storageUnavailable: false };
}

export function writeProjectSaves(storage, { currentKey, serialized, compatibilityKey = null, compatibilitySerialized = null }) {
  try {
    storage.setItem(currentKey, serialized);
  } catch (error) {
    return { saved: false, compatibilitySaved: false, error };
  }

  if (!compatibilityKey || compatibilitySerialized === null) {
    return { saved: true, compatibilitySaved: null, error: null };
  }

  try {
    storage.setItem(compatibilityKey, compatibilitySerialized);
    return { saved: true, compatibilitySaved: true, error: null };
  } catch (error) {
    // The current-format save is already committed. The compatibility copy is
    // a convenience for old builds, not part of the primary save transaction.
    return { saved: true, compatibilitySaved: false, error };
  }
}
