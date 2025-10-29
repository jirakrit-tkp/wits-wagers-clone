const QuestionCard = ({ question, round, totalRounds, correctAnswer }) => {
  if (!question) return null;

  const getCategoryColor = (category) => {
    const colors = {
      general: "bg-blue-500",
      entertainment: "bg-purple-500",
      dirty: "bg-pink-500",
    };
    return colors[category] || "bg-gray-500";
  };

  return (
    <article className="rounded-xl bg-yellow-100 shadow-xl overflow-hidden mb-6">
      <div className="p-4 sm:p-6">
        <div>
          {/* Category badge - top left and Round indicator - top right */}
          <div className="flex items-start justify-between mb-1">
            <span className={`inline-flex items-center rounded-full ${getCategoryColor(question.category)} px-2.5 sm:px-3 py-1 text-white text-xs font-semibold uppercase`}>
              {question.category}
            </span>
            {round !== undefined && totalRounds !== undefined && (
              <p className="text-xs text-yellow-700">
                Round {round}/{totalRounds}
              </p>
            )}
          </div>
          
          <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-yellow-900 leading-relaxed mb-3">
            {question.question}
          </h3>
          
          {/* Show correct answer if provided */}
          {correctAnswer !== undefined && correctAnswer !== null && (
            <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t-2 border-yellow-200">
              <div className="text-center">
                <p className="text-xs sm:text-sm text-yellow-700 font-semibold mb-1">Correct Answer</p>
                <p className="text-2xl sm:text-3xl font-black text-yellow-900">{correctAnswer}</p>
              </div>
              {question?.explanation && (
                <p className="text-xs text-yellow-700 mt-2 sm:mt-3 text-center leading-relaxed">{question.explanation}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </article>
  );
};

QuestionCard.displayName = "QuestionCard";

export default QuestionCard;

