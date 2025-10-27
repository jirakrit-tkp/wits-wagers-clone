const QuestionCard = ({ question, round, totalRounds }) => {
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
      general: "ทั่วไป",
      entertainment: "บันเทิง",
      dirty: "สนุกสนาน",
    };
    return labels[category] || category;
  };

  return (
    <article className="rounded-2xl bg-gradient-to-br from-yellow-100 to-yellow-50 shadow-xl border-2 border-yellow-300 p-6 mb-6">
      <header className="flex items-center justify-between mb-4">
        <span className={`inline-flex items-center gap-2 rounded-full ${getCategoryColor(question.category)} px-4 py-2 text-white text-sm font-semibold shadow-md`}>
          <span className="text-lg">📚</span>
          {getCategoryLabel(question.category)}
        </span>
        <span className="text-blue-900/60 font-semibold text-sm">
          คำถามที่ {round} / {totalRounds}
        </span>
      </header>

      <div className="bg-white rounded-xl p-6 shadow-inner border border-yellow-200">
        <h3 className="text-2xl md:text-3xl font-bold text-blue-900 leading-relaxed">
          {question.question}
        </h3>
      </div>

      <footer className="mt-4 flex items-center justify-center gap-2 text-blue-900/50 text-sm">
        <span>💡</span>
        <span>ตอบเป็นตัวเลขเท่านั้น</span>
      </footer>
    </article>
  );
};

QuestionCard.displayName = "QuestionCard";

export default QuestionCard;

