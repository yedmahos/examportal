const FacultyNote = ({ title, message }) => {
  return (
    <div className="admin-panel-card">
      <h3>{title}</h3>
      <p>{message}</p>
    </div>
  );
};

export default FacultyNote;
