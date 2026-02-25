import React from 'react';

// A collection of SVG icons for the toolbar buttons
const icons = {
  bold: <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"></path><path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"></path></svg>,
  italic: <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="4" x2="10" y2="4"></line><line x1="14" y1="20" x2="5" y2="20"></line><line x1="15" y1="4" x2="9" y2="20"></line></svg>,
  underline: <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M6 3v7a6 6 0 0 0 6 6 6 6 0 0 0 6-6V3"></path><line x1="4" y1="21" x2="20" y2="21"></line></svg>,
  strikethrough: <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4H9a3 3 0 0 0-2.83 4"></path><path d="M14 12a4 4 0 0 1 0 8H6"></path><line x1="4" y1="12" x2="20" y2="12"></line></svg>,
  undo: <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M21 9v6h-6"></path><path d="M3 10a9 9 0 0 1 9-4.56V4l-4 4 4 4v-1.44A7 7 0 0 0 7.03 15"></path></svg>,
  redo: <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9v6h6"></path><path d="M21 10a9 9 0 0 0-9-4.56V4l4 4-4 4v-1.44A7 7 0 0 1 16.97 15"></path></svg>,
  orderedList: <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><line x1="10" y1="6" x2="21" y2="6"></line><line x1="10" y1="12" x2="21" y2="12"></line><line x1="10" y1="18" x2="21" y2="18"></line><path d="M4 6h1v4"></path><path d="M4 10h2"></path><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"></path></svg>,
  unorderedList: <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>,
  clear: <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5V3M5.22 5.22l-1.42-1.42M18.78 5.22l1.42-1.42M12 13a5 5 0 0 0 5-5V3H7v5a5 5 0 0 0 5 5zM5 19h14"></path><path d="m16.5 15-5 6"></path></svg>,
  justifyLeft: <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><line x1="17" y1="10" x2="3" y2="10"></line><line x1="21" y1="6" x2="3" y2="6"></line><line x1="21" y1="14" x2="3" y2="14"></line><line x1="17" y1="18" x2="3" y2="18"></line></svg>,
  justifyCenter: <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="10" x2="6" y2="10"></line><line x1="21" y1="6" x2="3" y2="6"></line><line x1="21" y1="14" x2="3" y2="14"></line><line x1="18" y1="18" x2="6" y2="18"></line></svg>,
  justifyRight: <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><line x1="21" y1="10" x2="7" y2="10"></line><line x1="21" y1="6" x2="3" y2="6"></line><line x1="21" y1="14" x2="3" y2="14"></line><line x1="21" y1="18" x2="7" y2="18"></line></svg>,
};

// ToolbarButton is a reusable component for our editor's toolbar.
interface ToolbarButtonProps {
  command: string;
  title: string;
  children: React.ReactNode;
  isActive?: boolean;
}

const ToolbarButton: React.FC<ToolbarButtonProps> = ({ command, title, children, isActive }) => {
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    document.execCommand(command, false, undefined);
  };

  return (
    <button
      onMouseDown={handleMouseDown}
      title={title}
      className={`p-2 rounded-md transition-colors duration-150 ${isActive ? 'bg-blue-200 dark:bg-blue-900 hover:bg-blue-300 dark:hover:bg-blue-800' : 'hover:bg-zinc-200 dark:hover:bg-zinc-700 active:bg-zinc-300 dark:active:bg-zinc-600'}`}
    >
      {children}
    </button>
  );
};

// Main App component for the Word Editor
interface ActiveToolsState {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  insertOrderedList?: boolean;
  insertUnorderedList?: boolean;
  justifyLeft?: boolean;
  justifyCenter?: boolean;
  justifyRight?: boolean;
  formatBlock?: string;
  foreColor?: string;
}

export default function Editor() {
  const [activeTools, setActiveTools] = React.useState<ActiveToolsState>({});
  const editorRef = React.useRef<HTMLDivElement>(null);

  const rgbToHex = (rgb: string): string => {
    if (!rgb || !rgb.startsWith('rgb')) return '#000000';
    let sep = rgb.indexOf(",") > -1 ? "," : " ";
    let rgbArray = rgb.substring(4, rgb.length - 1).split(sep);
    let r = (+rgbArray[0]).toString(16).padStart(2, '0');
    let g = (+rgbArray[1]).toString(16).padStart(2, '0');
    let b = (+rgbArray[2]).toString(16).padStart(2, '0');
    return "#" + r + g + b;
  };

  const updateToolbarState = React.useCallback(() => {
    const commands = [
      'bold', 'italic', 'underline', 'strikethrough',
      'insertOrderedList', 'insertUnorderedList',
      'justifyLeft', 'justifyCenter', 'justifyRight'
    ] as const;
    type BooleanTool = typeof commands[number];

    const newActiveTools: ActiveToolsState = {};
    commands.forEach((command: BooleanTool) => {
      newActiveTools[command] = document.queryCommandState(command);
    });

    newActiveTools.formatBlock = document.queryCommandValue('formatBlock') || 'p';
    newActiveTools.foreColor = rgbToHex(document.queryCommandValue('foreColor'));

    setActiveTools(newActiveTools);
  }, []);

  React.useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    document.addEventListener('selectionchange', updateToolbarState);
    editor.addEventListener('focus', updateToolbarState);
    editor.addEventListener('mouseup', updateToolbarState);
    editor.addEventListener('keyup', updateToolbarState);


    updateToolbarState();

    return () => {
      document.removeEventListener('selectionchange', updateToolbarState);
      editor.removeEventListener('focus', updateToolbarState);
      editor.removeEventListener('mouseup', updateToolbarState);
      editor.removeEventListener('keyup', updateToolbarState);
    };
  }, [updateToolbarState]);

  const handleFormatBlock = (e: React.ChangeEvent<HTMLSelectElement>) => {
    document.execCommand('formatBlock', false, e.target.value);
  };

  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    document.execCommand('foreColor', false, e.target.value);
  }

  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-zinc-950 flex items-center justify-center p-4 sm:p-6 lg:p-8 font-sans">
      <div className="w-full max-w-4xl bg-white dark:bg-zinc-900 rounded-lg shadow-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800">

        {/* Toolbar */}
        <header className="p-3 border-b border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 flex flex-wrap items-center gap-x-1 sm:gap-x-2">
          <ToolbarButton command="undo" title="Undo">{icons.undo}</ToolbarButton>
          <ToolbarButton command="redo" title="Redo">{icons.redo}</ToolbarButton>
          <span className="w-px h-6 bg-zinc-300 dark:bg-zinc-600 mx-2"></span>
          <select value={activeTools.formatBlock || 'p'} onChange={handleFormatBlock} className="p-1.5 border-none rounded-md text-sm focus:ring-2 focus:ring-blue-500 bg-zinc-50 dark:bg-zinc-700 dark:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-600 cursor-pointer">
            <option value="p">Paragraph</option>
            <option value="h1">Heading 1</option>
            <option value="h2">Heading 2</option>
            <option value="h3">Heading 3</option>
          </select>
          <span className="w-px h-6 bg-zinc-300 dark:bg-zinc-600 mx-2"></span>
          <ToolbarButton command="bold" title="Bold" isActive={activeTools.bold}>{icons.bold}</ToolbarButton>
          <ToolbarButton command="italic" title="Italic" isActive={activeTools.italic}>{icons.italic}</ToolbarButton>
          <ToolbarButton command="underline" title="Underline" isActive={activeTools.underline}>{icons.underline}</ToolbarButton>
          <ToolbarButton command="strikethrough" title="Strikethrough" isActive={activeTools.strikethrough}>{icons.strikethrough}</ToolbarButton>
          <span className="w-px h-6 bg-zinc-300 dark:bg-zinc-600 mx-2"></span>
          <ToolbarButton command="justifyLeft" title="Align Left" isActive={activeTools.justifyLeft}>{icons.justifyLeft}</ToolbarButton>
          <ToolbarButton command="justifyCenter" title="Align Center" isActive={activeTools.justifyCenter}>{icons.justifyCenter}</ToolbarButton>
          <ToolbarButton command="justifyRight" title="Align Right" isActive={activeTools.justifyRight}>{icons.justifyRight}</ToolbarButton>
          <span className="w-px h-6 bg-zinc-300 dark:bg-zinc-600 mx-2"></span>
          <ToolbarButton command="insertOrderedList" title="Ordered List" isActive={activeTools.insertOrderedList}>{icons.orderedList}</ToolbarButton>
          <ToolbarButton command="insertUnorderedList" title="Unordered List" isActive={activeTools.insertUnorderedList}>{icons.unorderedList}</ToolbarButton>
          <span className="w-px h-6 bg-zinc-300 dark:bg-zinc-600 mx-2"></span>
          <div className="relative inline-flex items-center" title="Text Color">
            <input
              type="color"
              value={activeTools.foreColor || '#000000'}
              onChange={handleColorChange}
              className="w-8 h-8 p-0 border-none cursor-pointer appearance-none bg-transparent"
              style={{ 'backgroundColor': 'transparent' }}
            />
          </div>
          <ToolbarButton command="removeFormat" title="Clear Formatting">{icons.clear}</ToolbarButton>
        </header>

        {/* Editable Area */}
        <div className="p-6 sm:p-8 md:p-12">
          <div
            id="editor"
            ref={editorRef}
            contentEditable="true"
            suppressContentEditableWarning={true}
            className="h-[65vh] focus:outline-none overflow-y-auto prose dark:prose-invert max-w-none"
            spellCheck="false"
          >
            <h1>Welcome to Your React Word Editor!</h1>
            <p>
              This is a simple, modern word editor built with React and Tailwind CSS. You can use the toolbar above to format your text.
            </p>
            <p style={{ textAlign: 'center' }}>
              <b>Click around and type</b> to see the toolbar update based on the current selection's styling.
            </p>
            <ul>
              <li>Unordered item one</li>
              <li><i>Unordered item two (in italics)</i></li>
            </ul>
            <ol>
              <li>Ordered item one</li>
              <li><u>Ordered item two (underlined)</u></li>
            </ol>
            <p>
              Happy editing!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
