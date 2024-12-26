import React, { createContext, useContext, useState } from 'react';
import CommentOptionsModal from '../components/CommentOptionsModal';

const CommentModalContext = createContext();

export const CommentModalProvider = ({ children }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [onSelectComment, setOnSelectComment] = useState(null);

  const openCommentModal = (callback) => {
    setOnSelectComment(() => callback);
    setIsVisible(true);
  };

  const hideCommentModal = () => {
    setIsVisible(false);
    setOnSelectComment(null);
  };

  return (
    <CommentModalContext.Provider value={{ openCommentModal }}>
      {children}
      <CommentOptionsModal
        visible={isVisible}
        onClose={hideCommentModal}
        onSelectComment={(comment) => {
          if (onSelectComment) {
            onSelectComment(comment);
          }
          hideCommentModal();
        }}
      />
    </CommentModalContext.Provider>
  );
};

export const useCommentModal = () => {
  const context = useContext(CommentModalContext);
  if (!context) {
    throw new Error('useCommentModal must be used within a CommentModalProvider');
  }
  return context;
}; 