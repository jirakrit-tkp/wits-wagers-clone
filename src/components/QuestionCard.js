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

  const getCategoryLabel = (category) => {
    const labels = {
      general: "General",
      entertainment: "Entertainment",
      dirty: "Fun",
    };
    return labels[category] || category;
  };

  return (
    <article className="rounded-xl bg-gradient-to-br from-yellow-100 to-yellow-50 shadow-xl border-2 border-yellow-300 overflow-hidden mb-6">
      <div className="p-6 bg-gradient-to-r from-yellow-200 to-yellow-100">
        <header className="flex items-center justify-between mb-4">
          <span className="text-yellow-900 font-semibold text-sm">
            Question {round} / {totalRounds}
          </span>
        </header>

        <div>
          <h3 className="text-2xl md:text-3xl font-bold text-yellow-900 leading-relaxed mb-3">
            {question.question}
          </h3>
          
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center rounded-full ${getCategoryColor(question.category)} px-3 py-1 text-white text-xs font-semibold`}>
              {getCategoryLabel(question.category)}
            </span>
          </div>
          
          {/* Show correct answer if provided */}
          {correctAnswer !== undefined && correctAnswer !== null && (
            <div className="mt-4 pt-4 border-t-2 border-yellow-300">
              <div className="text-center">
                <p className="text-sm text-yellow-700 font-semibold mb-1">Correct Answer</p>
                <p className="text-3xl font-black text-yellow-900">{correctAnswer}</p>
              </div>
              {question?.explanation && (
                <p className="text-xs text-yellow-700 mt-3 text-center">{question.explanation}</p>
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

