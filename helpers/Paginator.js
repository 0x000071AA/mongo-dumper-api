
const Paginator = data => (itemsPerPage, currentPage) => {
  let numberOfPages = Math.ceil(data.length / itemsPerPage);

  if (currentPage > numberOfPages) {
    numberOfPages = currentPage;
  } else if (currentPage < 1) {
    currentPage = 1;
  }
  const from = itemsPerPage * (currentPage - 1);
  const to = Math.min((itemsPerPage * currentPage), numberOfPages);

  // find correspondending page with data defined by pagination
  const _data = data.slice(from, to);

  return {
    results: _data,
    from: from,
    to: to,
    totalPages: numberOfPages,
    currentPage: currentPage,
    previousPage: currentPage - 1 < 1 ? numberOfPages : currentPage - 1,
    nextPage: currentPage + 1 > numberOfPages ? 1 : currentPage + 1,
    hasPreviousPage: currentPage > 1,
    hasNextPage: currentPage < numberOfPages
  };
};

module.exports.Paginator = Paginator;
