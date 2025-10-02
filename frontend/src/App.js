import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import { Toaster } from './components/ui/sonner';
import { toast } from 'sonner';

// very small HTML sanitizer to avoid script/style injection in agent output
function sanitizeAgentHtml(html) {
  try {
    const div = document.createElement('div');
    div.innerHTML = html;
    // remove scripts and styles
    div.querySelectorAll('script, style, iframe, link, meta').forEach(n => n.remove());
    // ensure tables render nicely
    div.querySelectorAll('table').forEach(t => {
      t.classList.add('min-w-full','text-left','text-sm');
    });
    
    