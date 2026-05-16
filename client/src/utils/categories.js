export function getCategoryId(category) {
  return category?._id || category || '';
}

export function getCategoryParentId(category) {
  return category?.parent?._id || category?.parent || '';
}

export function getTopLevelCategories(categories = []) {
  return categories.filter((category) => !getCategoryParentId(category));
}

export function getCategoryScopeIds(categories = [], selectedId = '') {
  if (!selectedId) return [];

  const selected = categories.find((category) => getCategoryId(category) === selectedId);
  if (!selected || getCategoryParentId(selected)) return [selectedId];

  return [
    selectedId,
    ...categories
      .filter((category) => getCategoryParentId(category) === selectedId)
      .map(getCategoryId),
  ];
}
